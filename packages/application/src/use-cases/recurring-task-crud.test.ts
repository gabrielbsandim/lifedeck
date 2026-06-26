import { describe, expect, it } from 'vitest'
import {
  RecurringTask,
  asEntityId,
  type RecurrenceRule,
} from '@lifedeck/domain'
import { makeCreateRecurringTask } from '@/use-cases/create-recurring-task'
import { makeListRecurringTasks } from '@/use-cases/list-recurring-tasks'
import { makeUpdateRecurringTask } from '@/use-cases/update-recurring-task'
import { makeDeleteRecurringTask } from '@/use-cases/delete-recurring-task'
import { NotFoundError } from '@/errors/use-case-error'
import { parsePageCursor, type PageParams } from '@/index'
import { InMemoryRecurringTaskRepository } from '@/testing/in-memory-recurring-task-repository'
import { FixedClock, ID, SequentialIdGenerator } from '@/testing/fakes'

const RULE: RecurrenceRule = {
  freq: 'daily',
  interval: 1,
  startDate: '2026-06-21',
}

const ALL: PageParams = { limit: 50, cursor: null }

function setup() {
  const recurringTasks = new InMemoryRecurringTaskRepository()
  return {
    recurringTasks,
    createRecurringTask: makeCreateRecurringTask({
      recurringTasks,
      ids: new SequentialIdGenerator([ID.task]),
      clock: new FixedClock(new Date('2026-06-21T10:00:00.000Z')),
    }),
    listRecurringTasks: makeListRecurringTasks({ recurringTasks }),
    updateRecurringTask: makeUpdateRecurringTask({ recurringTasks }),
    deleteRecurringTask: makeDeleteRecurringTask({ recurringTasks }),
  }
}

describe('recurring task CRUD', () => {
  it('creates and lists a definition for the owner', async () => {
    const { createRecurringTask, listRecurringTasks } = setup()

    const view = await createRecurringTask(ID.user, {
      title: 'Drink water',
      rule: RULE,
    })

    expect(view).toMatchObject({
      id: ID.task,
      ownerId: ID.user,
      title: 'Drink water',
      rule: RULE,
    })
    expect((await listRecurringTasks(ID.user, ALL)).items).toHaveLength(1)
    expect((await listRecurringTasks(ID.otherUser, ALL)).items).toEqual([])
  })

  it('pages definitions newest-first and walks the cursor', async () => {
    const { recurringTasks, listRecurringTasks } = setup()
    const seeds = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Oldest',
        createdAt: '2026-06-19T10:00:00.000Z',
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        title: 'Middle',
        createdAt: '2026-06-20T10:00:00.000Z',
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        title: 'Newest',
        createdAt: '2026-06-21T10:00:00.000Z',
      },
    ]
    for (const seed of seeds) {
      await recurringTasks.save(
        RecurringTask.create({
          id: asEntityId(seed.id),
          ownerId: ID.user,
          title: seed.title,
          rule: RULE,
          createdAt: new Date(seed.createdAt),
        }),
      )
    }

    const first = await listRecurringTasks(ID.user, { ...ALL, limit: 2 })
    expect(first.items.map(view => view.title)).toEqual(['Newest', 'Middle'])
    expect(first.nextCursor).not.toBeNull()

    const second = await listRecurringTasks(ID.user, {
      ...ALL,
      limit: 2,
      cursor: parsePageCursor(first.nextCursor),
    })
    expect(second.items.map(view => view.title)).toEqual(['Oldest'])
    expect(second.nextCursor).toBeNull()
  })

  it('rejects an invalid rule on create', async () => {
    const { createRecurringTask } = setup()
    await expect(
      createRecurringTask(ID.user, {
        title: 'X',
        rule: { ...RULE, interval: 0 },
      }),
    ).rejects.toThrow()
  })

  it('updates the title and rule for the owner', async () => {
    const { createRecurringTask, updateRecurringTask } = setup()
    await createRecurringTask(ID.user, { title: 'Drink water', rule: RULE })

    const next: RecurrenceRule = {
      freq: 'weekly',
      interval: 1,
      byWeekday: [1, 3],
      startDate: '2026-06-21',
    }
    const view = await updateRecurringTask(ID.user, ID.task, {
      title: 'Stretch',
      rule: next,
    })

    expect(view).toMatchObject({ title: 'Stretch', rule: next })
  })

  it('hides another owner definition on update and delete', async () => {
    const { createRecurringTask, updateRecurringTask, deleteRecurringTask } =
      setup()
    await createRecurringTask(ID.user, { title: 'Drink water', rule: RULE })

    await expect(
      updateRecurringTask(ID.otherUser, ID.task, { title: 'X' }),
    ).rejects.toThrow(NotFoundError)
    await expect(deleteRecurringTask(ID.otherUser, ID.task)).rejects.toThrow(
      NotFoundError,
    )
  })

  it('deletes a definition for the owner', async () => {
    const { createRecurringTask, deleteRecurringTask, listRecurringTasks } =
      setup()
    await createRecurringTask(ID.user, { title: 'Drink water', rule: RULE })

    await deleteRecurringTask(ID.user, ID.task)

    expect((await listRecurringTasks(ID.user, ALL)).items).toEqual([])
  })
})
