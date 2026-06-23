import { describe, expect, it } from 'vitest'
import { asEntityId } from '@lifedeck/domain'
import { makeCreateList } from '@/use-cases/create-list'
import { makeCreateTask } from '@/use-cases/create-task'
import { makeReorderTasks } from '@/use-cases/reorder-tasks'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryListRepository } from '@/testing/in-memory-list-repository'
import { InMemoryTaskRepository } from '@/testing/in-memory-task-repository'
import { InMemoryMembershipRepository } from '@/testing/in-memory-membership-repository'
import { FixedClock, ID, SequentialIdGenerator } from '@/testing/fakes'

const T1 = asEntityId('11111111-1111-4111-8111-111111111111')
const T2 = asEntityId('22222222-2222-4222-8222-222222222222')
const T3 = asEntityId('33333333-3333-4333-8333-333333333333')

async function setup() {
  const lists = new InMemoryListRepository()
  const tasks = new InMemoryTaskRepository()
  const memberships = new InMemoryMembershipRepository()
  const clock = new FixedClock(new Date('2026-06-22T10:00:00.000Z'))
  const createList = makeCreateList({
    lists,
    ids: new SequentialIdGenerator([ID.list]),
    clock,
  })
  const createTask = makeCreateTask({
    tasks,
    lists,
    memberships,
    ids: new SequentialIdGenerator([T1, T2, T3]),
    clock,
  })
  const reorderTasks = makeReorderTasks({ tasks, lists, memberships })

  await createList(ID.user, { title: 'Wedding' })
  await createTask(ID.user, { listId: ID.list, title: 'First' })
  await createTask(ID.user, { listId: ID.list, title: 'Second' })
  await createTask(ID.user, { listId: ID.list, title: 'Third' })

  return { tasks, reorderTasks }
}

describe('reorderTasks', () => {
  it('assigns sequential positions following the requested order', async () => {
    const { tasks, reorderTasks } = await setup()

    const result = await reorderTasks(ID.user, ID.list, {
      taskIds: [T3, T1, T2],
    })

    expect(result.map(task => task.title)).toEqual(['Third', 'First', 'Second'])
    const stored = await tasks.listByList(ID.list)
    expect(stored.map(task => task.position)).toEqual([0, 1, 2])
    expect(stored.map(task => task.id)).toEqual([T3, T1, T2])
  })

  it('ignores ids that do not belong to the list', async () => {
    const { reorderTasks } = await setup()
    const result = await reorderTasks(ID.user, ID.list, {
      taskIds: [T3, T1, T2, '99999999-9999-4999-8999-999999999999'],
    })
    expect(result.map(task => task.title)).toEqual(['Third', 'First', 'Second'])
  })

  it('hides the list from a requester without access', async () => {
    const { reorderTasks } = await setup()
    await expect(
      reorderTasks(ID.otherUser, ID.list, { taskIds: [T1] }),
    ).rejects.toThrow(NotFoundError)
  })
})
