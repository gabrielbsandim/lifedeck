import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { User, asEntityId } from '@lifedeck/domain'
import { PrismaAppleGrantStore } from '@/database/prisma-apple-grant-store'
import { PrismaUserRepository } from '@/database/prisma-user-repository'

const prisma = new PrismaClient()
const USER = asEntityId('3e000000-0000-4000-8000-000000000001')
const NOW = new Date('2026-11-25T12:00:00.000Z')

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { id: USER } })
  await new PrismaUserRepository(prisma).save(
    User.createGuest({
      id: USER,
      displayName: 'Apple user',
      locale: 'en',
      createdAt: NOW,
    }),
  )
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: USER } })
  await prisma.$disconnect()
})

describe('PrismaAppleGrantStore', () => {
  it('keeps the latest refresh token per user and drops it with the user', async () => {
    const store = new PrismaAppleGrantStore(prisma)
    expect(await store.find(USER)).toBeNull()
    await store.save(USER, 'r1')
    await store.save(USER, 'r2')
    expect(await store.find(USER)).toBe('r2')
    await prisma.user.delete({ where: { id: USER } })
    expect(await prisma.appleGrant.count({ where: { userId: USER } })).toBe(0)
  })
})
