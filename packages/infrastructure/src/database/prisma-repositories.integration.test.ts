import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  ApiKey,
  List,
  PushDevice,
  Task,
  User,
  asEntityId,
} from '@lifedeck/domain'
import { PrismaListRepository } from '@/database/prisma-list-repository'
import { PrismaTaskRepository } from '@/database/prisma-task-repository'
import { PrismaUserRepository } from '@/database/prisma-user-repository'
import { PrismaApiKeyRepository } from '@/database/prisma-api-key-repository'
import { PrismaPushDeviceRepository } from '@/database/prisma-push-device-repository'

const prisma = new PrismaClient()
const users = new PrismaUserRepository(prisma)
const lists = new PrismaListRepository(prisma)
const tasks = new PrismaTaskRepository(prisma)
const apiKeys = new PrismaApiKeyRepository(prisma)
const pushDevices = new PrismaPushDeviceRepository(prisma)

const USER = asEntityId('1a000000-0000-4000-8000-0000000000a1')
const LIST_A = asEntityId('1a000000-0000-4000-8000-0000000000b1')
const LIST_B = asEntityId('1a000000-0000-4000-8000-0000000000b2')
const TASK = asEntityId('1a000000-0000-4000-8000-0000000000c1')
const API_KEY = asEntityId('1a000000-0000-4000-8000-0000000000d1')
const PUSH_DEVICE = asEntityId('1a000000-0000-4000-8000-0000000000e1')
const PUSH_TOKEN = 'ExponentPushToken[integration]'
const NOW = new Date('2026-06-22T10:00:00.000Z')

function standalone(id: typeof LIST_A, title: string): List {
  return List.create({
    id,
    ownerId: USER,
    title,
    type: 'standalone',
    visibility: 'private',
    referenceDate: null,
    createdAt: NOW,
  })
}

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { id: USER } })
  await users.save(
    User.createGuest({
      id: USER,
      displayName: 'Integration',
      locale: 'en',
      createdAt: NOW,
    }),
  )
  await lists.save(standalone(LIST_A, 'List A'))
  await lists.save(standalone(LIST_B, 'List B'))
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: USER } })
  await prisma.$disconnect()
})

describe('Prisma repositories (integration)', () => {
  it('round-trips a task through save and findById', async () => {
    await tasks.save(
      Task.create({
        id: TASK,
        listId: LIST_A,
        title: 'Round trip',
        createdAt: NOW,
      }),
    )
    const found = await tasks.findById(TASK)
    expect(found?.toJSON().title).toBe('Round trip')
    expect(found?.listId).toBe(LIST_A)
  })

  it('persists a task that moves to another list', async () => {
    const task = await tasks.findById(TASK)
    if (!task) {
      throw new Error('Task was not found.')
    }
    task.moveTo(LIST_B, 3)
    await tasks.save(task)

    const moved = await tasks.findById(TASK)
    expect(moved?.listId).toBe(LIST_B)
    expect(moved?.position).toBe(3)
    expect(await tasks.listByList(LIST_A)).toHaveLength(0)
    expect(await tasks.listByList(LIST_B)).toHaveLength(1)
  })

  it('finds a user by email after registration', async () => {
    const user = await users.findById(USER)
    if (!user) {
      throw new Error('User was not found.')
    }
    user.register({
      email: 'integration@lifedeck.app',
      passwordHash: 'hashed',
      emailVerifiedAt: null,
    })
    await users.save(user)

    const byEmail = await users.findByEmail('integration@lifedeck.app')
    expect(byEmail?.id).toBe(USER)
  })

  it('looks up an api key by its secret hash', async () => {
    await apiKeys.save(
      ApiKey.create({
        id: API_KEY,
        userId: USER,
        name: 'Integration key',
        prefix: 'tk_live_intg',
        hashedSecret: 'integration-secret-hash',
        scopes: ['tasks:read'],
        expiresAt: null,
        createdAt: NOW,
      }),
    )
    const found = await apiKeys.findBySecretHash('integration-secret-hash')
    expect(found?.id).toBe(API_KEY)
    expect(found?.scopes).toEqual(['tasks:read'])
    expect(await apiKeys.listByUser(USER)).toHaveLength(1)
  })

  it('re-registers a push device onto the token that already exists', async () => {
    const first = PushDevice.create({
      id: PUSH_DEVICE,
      userId: USER,
      token: PUSH_TOKEN,
      platform: 'ios',
      createdAt: NOW,
    })
    await pushDevices.save(first)

    // A second launch mints the same token but a new id. The unique index on the
    // token is what keeps this from inserting a duplicate the fan-out would then
    // notify twice.
    const again = PushDevice.create({
      id: asEntityId('1a000000-0000-4000-8000-0000000000e2'),
      userId: USER,
      token: PUSH_TOKEN,
      platform: 'android',
      createdAt: new Date(NOW.getTime() + 60_000),
    })
    await pushDevices.save(again)

    const stored = await pushDevices.listByUser(USER)
    expect(stored).toHaveLength(1)
    expect(stored[0]?.id).toBe(PUSH_DEVICE)
    expect(stored[0]?.platform).toBe('android')

    await pushDevices.deleteByTokens([PUSH_TOKEN])
    expect(await pushDevices.findByToken(PUSH_TOKEN)).toBeNull()
    // Deleting nothing is a no-op rather than an error: the caller passes
    // whatever the provider reported, which can be an empty list.
    await expect(pushDevices.deleteByTokens([])).resolves.toBeUndefined()
  })

  it('cascades task deletion when a list is deleted', async () => {
    await tasks.save(
      Task.create({
        id: asEntityId('1a000000-0000-4000-8000-0000000000c2'),
        listId: LIST_B,
        title: 'To be cascaded',
        createdAt: NOW,
      }),
    )
    await lists.delete(LIST_B)
    expect(await tasks.listByList(LIST_B)).toHaveLength(0)
  })
})
