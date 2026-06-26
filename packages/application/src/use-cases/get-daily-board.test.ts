import { describe, expect, it } from 'vitest'
import {
  List,
  RecurringTask,
  Subtask,
  Task,
  User,
  asEntityId,
  type CarryOverMode,
  type RecurrenceRule,
} from '@lifedeck/domain'
import { makeGetDailyBoard } from '@/use-cases/get-daily-board'
import { InMemoryListRepository } from '@/testing/in-memory-list-repository'
import { InMemoryTaskRepository } from '@/testing/in-memory-task-repository'
import { InMemoryRecurringTaskRepository } from '@/testing/in-memory-recurring-task-repository'
import { InMemorySubtaskRepository } from '@/testing/in-memory-subtask-repository'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import {
  FakeUnitOfWork,
  FixedClock,
  ID,
  SequentialIdGenerator,
} from '@/testing/fakes'

const NOW = new Date('2026-06-21T10:00:00.000Z')
const DEF_ID = asEntityId('c3e0f4a6-7d8e-4f90-a1b2-c3d4e5f6a7b8')

async function makeUserRepo(mode: CarryOverMode = 'manual') {
  const users = new InMemoryUserRepository()
  const user = User.createGuest({
    id: ID.user,
    displayName: 'Gabriel',
    locale: 'en',
    createdAt: NOW,
  })
  user.setCarryOverMode(mode)
  await users.save(user)
  return users
}

async function setup(rule?: RecurrenceRule) {
  const lists = new InMemoryListRepository()
  const tasks = new InMemoryTaskRepository()
  const subtasks = new InMemorySubtaskRepository()
  const recurringTasks = new InMemoryRecurringTaskRepository()
  const users = await makeUserRepo()
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
    subtasks,
    recurringTasks,
    users,
    ids: new SequentialIdGenerator([ID.list, ID.task]),
    clock: new FixedClock(NOW),
    unitOfWork: new FakeUnitOfWork(),
  })
  return { tasks, getDailyBoard }
}

const PRIOR_LIST = asEntityId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
const TODAY_LIST = asEntityId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
const PENDING = asEntityId('cccccccc-cccc-4ccc-8ccc-cccccccccccc')
const DONE = asEntityId('dddddddd-dddd-4ddd-8ddd-dddddddddddd')
const RECUR = asEntityId('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')

async function seedPriorDay(
  lists: InMemoryListRepository,
  tasks: InMemoryTaskRepository,
) {
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
      observation: 'Gold',
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
}

describe('getDailyBoard', () => {
  it('provisions the daily list with no tasks when there are no definitions', async () => {
    const { getDailyBoard } = await setup()

    const board = await getDailyBoard(ID.user, '2026-06-21')

    expect(board.list).toMatchObject({
      id: ID.list,
      type: 'daily',
      referenceDate: '2026-06-21',
    })
    expect(board.tasks).toEqual([])
    expect(board.carryOver).toEqual([])
  })

  it('materializes a recurring task that occurs on the date', async () => {
    const { getDailyBoard } = await setup({
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
    const { tasks, getDailyBoard } = await setup({
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
    const { getDailyBoard } = await setup({
      freq: 'weekly',
      interval: 1,
      byWeekday: [1], // Mondays; 2026-06-21 is a Sunday
      startDate: '2026-06-21',
    })

    const board = await getDailyBoard(ID.user, '2026-06-21')

    expect(board.tasks).toEqual([])
  })

  it('lists prior unfinished tasks as carry-over candidates in manual mode', async () => {
    const lists = new InMemoryListRepository()
    const tasks = new InMemoryTaskRepository()
    const subtasks = new InMemorySubtaskRepository()
    const recurringTasks = new InMemoryRecurringTaskRepository()
    const users = await makeUserRepo('manual')
    await seedPriorDay(lists, tasks)

    const getDailyBoard = makeGetDailyBoard({
      lists,
      tasks,
      subtasks,
      recurringTasks,
      users,
      ids: new SequentialIdGenerator([TODAY_LIST]),
      clock: new FixedClock(NOW),
      unitOfWork: new FakeUnitOfWork(),
    })

    const board = await getDailyBoard(ID.user, '2026-06-21')

    expect(board.tasks).toEqual([])
    expect(board.carryOver).toHaveLength(1)
    expect(board.carryOver[0]).toMatchObject({
      fromDate: '2026-06-20',
      task: { title: 'Buy rings' },
    })
    // Originals are left untouched in manual mode.
    expect(await tasks.listByList(PRIOR_LIST)).toHaveLength(3)
    expect(await tasks.listByList(TODAY_LIST)).toHaveLength(0)
  })

  it('auto-copies prior unfinished tasks and freezes the originals in auto mode', async () => {
    const COPY = asEntityId('ffffffff-ffff-4fff-8fff-ffffffffffff')
    const lists = new InMemoryListRepository()
    const tasks = new InMemoryTaskRepository()
    const subtasks = new InMemorySubtaskRepository()
    const recurringTasks = new InMemoryRecurringTaskRepository()
    const users = await makeUserRepo('auto')
    await seedPriorDay(lists, tasks)

    const getDailyBoard = makeGetDailyBoard({
      lists,
      tasks,
      subtasks,
      recurringTasks,
      users,
      ids: new SequentialIdGenerator([TODAY_LIST, COPY]),
      clock: new FixedClock(NOW),
      unitOfWork: new FakeUnitOfWork(),
    })

    const board = await getDailyBoard(ID.user, '2026-06-21')

    expect(board.carryOver).toEqual([])
    expect(board.tasks.map(task => task.title)).toEqual(['Buy rings'])
    expect(board.tasks[0]).toMatchObject({
      observation: 'Gold',
      carriedFromDate: '2026-06-20',
    })
    // Original stays as a frozen record (still pending, now carried forward).
    const original = await tasks.findById(PENDING)
    expect(original?.isCarriedForward).toBe(true)
    expect(original?.status).toBe('pending')

    // Re-opening today does not duplicate the copy.
    await getDailyBoard(ID.user, '2026-06-21')
    expect(await tasks.listByList(TODAY_LIST)).toHaveLength(1)
  })

  it('copies subtasks onto the carried task, preserving their status', async () => {
    const COPY = asEntityId('ffffffff-ffff-4fff-8fff-ffffffffffff')
    const SUB_A = asEntityId('11111111-1111-4111-8111-111111111111')
    const SUB_B = asEntityId('22222222-2222-4222-8222-222222222222')
    const SUB_COPY_A = asEntityId('33333333-3333-4333-8333-333333333333')
    const SUB_COPY_B = asEntityId('44444444-4444-4444-8444-444444444444')
    const lists = new InMemoryListRepository()
    const tasks = new InMemoryTaskRepository()
    const subtasks = new InMemorySubtaskRepository()
    const recurringTasks = new InMemoryRecurringTaskRepository()
    const users = await makeUserRepo('auto')
    await seedPriorDay(lists, tasks)
    const doneSub = Subtask.create({
      id: SUB_A,
      taskId: PENDING,
      title: 'Pick metal',
      position: 0,
      createdAt: NOW,
    })
    doneSub.complete(NOW)
    await subtasks.save(doneSub)
    await subtasks.save(
      Subtask.create({
        id: SUB_B,
        taskId: PENDING,
        title: 'Get sizes',
        position: 1,
        createdAt: NOW,
      }),
    )

    const getDailyBoard = makeGetDailyBoard({
      lists,
      tasks,
      subtasks,
      recurringTasks,
      users,
      ids: new SequentialIdGenerator([
        TODAY_LIST,
        COPY,
        SUB_COPY_A,
        SUB_COPY_B,
      ]),
      clock: new FixedClock(NOW),
      unitOfWork: new FakeUnitOfWork(),
    })

    const board = await getDailyBoard(ID.user, '2026-06-21')

    expect(board.tasks[0]).toMatchObject({
      id: COPY,
      subtasks: { total: 2, completed: 1 },
    })
    const copied = await subtasks.listByTask(COPY)
    expect(copied.map(subtask => subtask.toJSON().title)).toEqual([
      'Pick metal',
      'Get sizes',
    ])
    expect(copied.map(subtask => subtask.status)).toEqual([
      'completed',
      'pending',
    ])
  })

  it('does not carry over when viewing a date that is not today', async () => {
    const PAST_LIST = asEntityId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    const lists = new InMemoryListRepository()
    const tasks = new InMemoryTaskRepository()
    const subtasks = new InMemorySubtaskRepository()
    const recurringTasks = new InMemoryRecurringTaskRepository()
    const users = await makeUserRepo('auto')

    await lists.save(
      List.create({
        id: asEntityId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
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
        listId: asEntityId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
        title: 'Old task',
        createdAt: NOW,
      }),
    )

    const getDailyBoard = makeGetDailyBoard({
      lists,
      tasks,
      subtasks,
      recurringTasks,
      users,
      ids: new SequentialIdGenerator([PAST_LIST]),
      clock: new FixedClock(NOW),
      unitOfWork: new FakeUnitOfWork(),
    })

    const board = await getDailyBoard(ID.user, '2026-06-20')

    expect(board.tasks).toEqual([])
    expect(board.carryOver).toEqual([])
  })
})
