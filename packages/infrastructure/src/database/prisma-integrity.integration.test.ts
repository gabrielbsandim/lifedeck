import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { List, Task, User, asEntityId } from '@lifedeck/domain'
import {
  FakeDispatchWatermark,
  makeEnqueueDailyDigests,
} from '@lifedeck/application'
import { PrismaListRepository } from '@/database/prisma-list-repository'
import { PrismaScheduledJobRepository } from '@/database/prisma-scheduled-job-repository'
import { PrismaTaskRepository } from '@/database/prisma-task-repository'
import { PrismaUserRepository } from '@/database/prisma-user-repository'
import { OutboxJobQueue } from '@/scheduling/outbox-job-queue'
import { NoopJobScheduler } from '@/scheduling/noop-job-scheduler'

const prisma = new PrismaClient()
const users = new PrismaUserRepository(prisma)
const lists = new PrismaListRepository(prisma)
const tasks = new PrismaTaskRepository(prisma)
const scheduledJobs = new PrismaScheduledJobRepository(prisma)

const USER = asEntityId('2b000000-0000-4000-8000-0000000000a1')
const PRIOR_LIST = asEntityId('2b000000-0000-4000-8000-0000000000b1')
const TASK = asEntityId('2b000000-0000-4000-8000-0000000000c1')
const EMAIL = 'integrity@lifedeck.dev'
// 10:00 UTC is 07:00 in Sao Paulo, the default digest hour.
const NOW = new Date('2026-06-22T10:00:00.000Z')
const DAY = new Date('2026-06-22T00:00:00.000Z')

function daily(id: string): List {
  return List.create({
    id: asEntityId(id),
    ownerId: USER,
    title: '2026-06-22',
    type: 'daily',
    visibility: 'private',
    referenceDate: DAY,
    createdAt: NOW,
  })
}

async function cleanUp() {
  await prisma.scheduledJob.deleteMany({
    where: { type: 'daily-digest', runAt: NOW },
  })
  await prisma.user.deleteMany({ where: { id: USER } })
}

beforeAll(async () => {
  await cleanUp()
  const user = User.createGuest({
    id: USER,
    displayName: 'Integrity',
    locale: 'en',
    timezone: 'America/Sao_Paulo',
    createdAt: NOW,
  })
  user.register({ email: EMAIL, passwordHash: 'hash', emailVerifiedAt: NOW })
  await users.save(user)
})

afterAll(async () => {
  await cleanUp()
  await prisma.$disconnect()
})

describe('integrity guards (integration)', () => {
  it('enqueues one digest when the fan-out runs twice in the same hour', async () => {
    let next = 0
    const queue = new OutboxJobQueue(
      scheduledJobs,
      {
        generate: () =>
          asEntityId(`2b000000-0000-4000-8000-00000000f0${next++}0`),
      },
      { now: () => NOW },
      new NoopJobScheduler(),
      new FakeDispatchWatermark(),
    )
    const fanOut = makeEnqueueDailyDigests({
      users,
      jobQueue: queue,
      clock: { now: () => NOW },
    })

    await Promise.all([fanOut(), fanOut()])
    await fanOut()

    const jobs = await prisma.scheduledJob.findMany({
      where: { dedupKey: `daily-digest:${USER}:2026-06-22` },
    })
    expect(jobs).toHaveLength(1)
  })

  it('keeps one daily list per owner and date under concurrent inserts', async () => {
    const [first, second] = await Promise.all([
      lists.ensureDaily(daily('2b000000-0000-4000-8000-0000000000d1')),
      lists.ensureDaily(daily('2b000000-0000-4000-8000-0000000000d2')),
    ])

    expect(first.id).toBe(second.id)
    const rows = await prisma.list.count({
      where: { ownerId: USER, type: 'daily', referenceDate: DAY },
    })
    expect(rows).toBe(1)
  })

  it('lets exactly one caller claim a task for carry-over', async () => {
    await lists.save(
      List.create({
        id: PRIOR_LIST,
        ownerId: USER,
        title: 'Prior',
        type: 'standalone',
        visibility: 'private',
        referenceDate: null,
        createdAt: NOW,
      }),
    )
    await tasks.save(
      Task.create({
        id: TASK,
        listId: PRIOR_LIST,
        title: 'Buy',
        createdAt: NOW,
      }),
    )

    const claims = await Promise.all([
      tasks.claimCarryForward(TASK, NOW),
      tasks.claimCarryForward(TASK, NOW),
    ])

    expect(claims.filter(Boolean)).toHaveLength(1)
    expect((await tasks.findById(TASK))?.isCarriedForward).toBe(true)
  })
})
