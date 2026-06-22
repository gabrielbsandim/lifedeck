import { describe, expect, it } from 'vitest'
import { RecurringTask, asEntityId, type RecurrenceRule } from '@taskin/domain'
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
})
