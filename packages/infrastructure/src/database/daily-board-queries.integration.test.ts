import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { List, RecurringTask, Task, User, asEntityId } from '@lifedeck/domain'
import { makeGetDailyBoard } from '@lifedeck/application'
import { PrismaListRepository } from '@/database/prisma-list-repository'
import { PrismaRecurringTaskRepository } from '@/database/prisma-recurring-task-repository'
import { PrismaSubtaskRepository } from '@/database/prisma-subtask-repository'
import { PrismaTaskRepository } from '@/database/prisma-task-repository'
import {
  PrismaUnitOfWork,
  createTransactionalClient,
} from '@/database/prisma-unit-of-work'
import { PrismaUserRepository } from '@/database/prisma-user-repository'
import { UuidGenerator } from '@/id/uuid-generator'

const root = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] })
const statements: string[] = []
root.$on('query', event => statements.push(event.query))

const db = createTransactionalClient(root)
const users = new PrismaUserRepository(db)
const lists = new PrismaListRepository(db)
const tasks = new PrismaTaskRepository(db)

const USER = asEntityId('2c000000-0000-4000-8000-0000000000a1')
const YESTERDAY_LIST = asEntityId('2c000000-0000-4000-8000-0000000000b1')
const LEFTOVER = asEntityId('2c000000-0000-4000-8000-0000000000c1')
const DEFINITION = asEntityId('2c000000-0000-4000-8000-0000000000d1')
// 15:00 UTC is midday in Sao Paulo, so "today" is 2026-06-22 for this user.
const NOW = new Date('2026-06-22T15:00:00.000Z')
const TODAY = '2026-06-22'

const getDailyBoard = makeGetDailyBoard({
  lists,
  tasks,
  subtasks: new PrismaSubtaskRepository(db),
  recurringTasks: new PrismaRecurringTaskRepository(db),
  users,
  ids: new UuidGenerator(),
  clock: { now: () => NOW },
  unitOfWork: new PrismaUnitOfWork(root),
})

async function cleanUp() {
  await root.recurringTask.deleteMany({ where: { ownerId: USER } })
  await root.user.deleteMany({ where: { id: USER } })
}

beforeAll(async () => {
  await cleanUp()
  const user = User.createGuest({
    id: USER,
    displayName: 'Poller',
    locale: 'en',
    timezone: 'America/Sao_Paulo',
    createdAt: NOW,
  })
  await users.save(user)
  await lists.save(
    List.create({
      id: YESTERDAY_LIST,
      ownerId: USER,
      title: '2026-06-21',
      type: 'daily',
      visibility: 'private',
      referenceDate: new Date('2026-06-21T00:00:00.000Z'),
      createdAt: NOW,
    }),
  )
  await tasks.save(
    Task.create({
      id: LEFTOVER,
      listId: YESTERDAY_LIST,
      title: 'Call the bank',
      createdAt: NOW,
    }),
  )
  await new PrismaRecurringTaskRepository(db).save(
    RecurringTask.create({
      id: DEFINITION,
      ownerId: USER,
      title: 'Drink water',
      rule: { freq: 'daily', interval: 1, startDate: '2026-06-01' },
      createdAt: NOW,
    }),
  )
})

afterAll(async () => {
  await cleanUp()
  await root.$disconnect()
})

describe('getDailyBoard against Postgres', () => {
  it('a steady-state poll reads the board in 7 statements (10 before A7) and opens no transaction', async () => {
    const first = await getDailyBoard(USER, TODAY)
    statements.length = 0

    const poll = await getDailyBoard(USER, TODAY)

    expect(poll).toEqual(first)
    expect(poll.tasks.map(task => task.title)).toEqual(['Drink water'])
    expect(poll.carryOver.map(item => item.task.title)).toEqual([
      'Call the bank',
    ])
    expect(statements).not.toContain('BEGIN')
    expect(statements).toHaveLength(7)
  })
})
