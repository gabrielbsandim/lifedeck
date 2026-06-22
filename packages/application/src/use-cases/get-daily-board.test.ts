import { describe, expect, it } from 'vitest'
import {
  List,
  RecurringTask,
  Task,
  asEntityId,
  type RecurrenceRule,
} from '@taskin/domain'
import { makeGetDailyBoard } from '@/use-cases/get-daily-board'
import { InMemoryListRepository } from '@/testing/in-memory-list-repository'
import { InMemoryTaskRepository } from '@/testing/in-memory-task-repository'
import { InMemoryRecurringTaskRepository } from '@/testing/in-memory-recurring-task-repository'
import { FixedClock, ID, SequentialIdGenerator } from '@/testing/fakes'

const NOW = new Date('2026-06-21T10:00:00.000Z')
const DEF_ID = asEntityId('c3e0f4a6-7d8e-4f90-a1b2-c3d4e5f6a7b8')

function setup(rule?: RecurrenceRule) {
  const lists = new InMemoryListRepository()
  const tasks = new InMemoryTaskRepository()
  const recurringTasks = new InMemoryRecurringTaskRepository()
  if (rule) {
    recurringTasks.save(
      RecurringTask.create({
        id: DEF_ID,
        ownerId: ID.user,
        title: 'Drink water',
        rule,
        createdAt: NOW,
      }),
    )
  }
  const getDailyBoard = makeGetDailyBoard({
    lists,
    tasks,
    recurringTasks,
    ids: new SequentialIdGenerator([ID.list, ID.task]),
    clock: new FixedClock(NOW),
  })
  return { tasks, getDailyBoard }
}

describe('getDailyBoard', () => {
  it('provisions the daily list with no tasks when there are no definitions', async () => {
    const { getDailyBoard } = setup()

    const board = await getDailyBoard(ID.user, '2026-06-21')

    expect(board.list).toMatchObject({
      id: ID.list,
      type: 'daily',
      referenceDate: '2026-06-21',
    })
    expect(board.tasks).toEqual([])
  })

  it('materializes a recurring task that occurs on the date', async () => {
    const { getDailyBoard } = setup({
      freq: 'daily',
      interval: 1,
      startDate: '2026-06-21',
    })

    const board = await getDailyBoard(ID.user, '2026-06-21')

    expect(board.tasks).toHaveLength(1)
    expect(board.tasks[0]).toMatchObject({
      title: 'Drink water',
      status: 'pending',
      recurringTaskId: DEF_ID,
    })
  })

  it('does not duplicate the instance on repeated requests', async () => {
    const { tasks, getDailyBoard } = setup({
      freq: 'daily',
      interval: 1,
      startDate: '2026-06-21',
    })

    await getDailyBoard(ID.user, '2026-06-21')
    const board = await getDailyBoard(ID.user, '2026-06-21')

    expect(board.tasks).toHaveLength(1)
    expect(await tasks.listByList(ID.list)).toHaveLength(1)
  })

  it('skips a definition that does not occur on the date', async () => {
    const { getDailyBoard } = setup({
      freq: 'weekly',
      interval: 1,
      byWeekday: [1], // Mondays; 2026-06-21 is a Sunday
      startDate: '2026-06-21',
    })

    const board = await getDailyBoard(ID.user, '2026-06-21')

    expect(board.tasks).toEqual([])
  })

  it('carries unfinished, non-recurring tasks from prior days into today', async () => {
    const PRIOR_LIST = asEntityId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    const TODAY_LIST = asEntityId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    const PENDING = asEntityId('cccccccc-cccc-4ccc-8ccc-cccccccccccc')
    const DONE = asEntityId('dddddddd-dddd-4ddd-8ddd-dddddddddddd')
    const RECUR = asEntityId('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')

    const lists = new InMemoryListRepository()
    const tasks = new InMemoryTaskRepository()
    const recurringTasks = new InMemoryRecurringTaskRepository()

    await lists.save(
      List.create({
        id: PRIOR_LIST,
        ownerId: ID.user,
        title: '2026-06-20',
        type: 'daily',
        visibility: 'private',
        referenceDate: new Date('2026-06-20T00:00:00.000Z'),
        createdAt: new Date('2026-06-20T10:00:00.000Z'),
      }),
    )
    await tasks.save(
      Task.create({
        id: PENDING,
        listId: PRIOR_LIST,
        title: 'Buy rings',
        createdAt: NOW,
      }),
    )
    const done = Task.create({
      id: DONE,
      listId: PRIOR_LIST,
      title: 'Send invites',
      createdAt: NOW,
    })
    done.complete(NOW)
    await tasks.save(done)
    await tasks.save(
      Task.create({
        id: RECUR,
        listId: PRIOR_LIST,
        title: 'Drink water',
        createdAt: NOW,
        recurringTaskId: DEF_ID,
      }),
    )

    const getDailyBoard = makeGetDailyBoard({
      lists,
      tasks,
      recurringTasks,
      ids: new SequentialIdGenerator([TODAY_LIST]),
      clock: new FixedClock(NOW),
    })

    const board = await getDailyBoard(ID.user, '2026-06-21')

    expect(board.tasks.map(task => task.title)).toEqual(['Buy rings'])
    expect(await tasks.listByList(PRIOR_LIST)).toHaveLength(2)
    expect(await tasks.listByList(TODAY_LIST)).toHaveLength(1)
  })

  it('does not carry over when viewing a date that is not today', async () => {
    const PRIOR_LIST = asEntityId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    const PAST_LIST = asEntityId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    const PENDING = asEntityId('cccccccc-cccc-4ccc-8ccc-cccccccccccc')

    const lists = new InMemoryListRepository()
    const tasks = new InMemoryTaskRepository()
    const recurringTasks = new InMemoryRecurringTaskRepository()

    await lists.save(
      List.create({
        id: PRIOR_LIST,
        ownerId: ID.user,
        title: '2026-06-19',
        type: 'daily',
        visibility: 'private',
        referenceDate: new Date('2026-06-19T00:00:00.000Z'),
        createdAt: new Date('2026-06-19T10:00:00.000Z'),
      }),
    )
    await tasks.save(
      Task.create({
        id: PENDING,
        listId: PRIOR_LIST,
        title: 'Old task',
        createdAt: NOW,
      }),
    )

    const getDailyBoard = makeGetDailyBoard({
      lists,
      tasks,
      recurringTasks,
      ids: new SequentialIdGenerator([PAST_LIST]),
      clock: new FixedClock(NOW),
    })

    const board = await getDailyBoard(ID.user, '2026-06-20')

    expect(board.tasks).toEqual([])
    expect(await tasks.listByList(PRIOR_LIST)).toHaveLength(1)
  })
})
