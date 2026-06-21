import { describe, expect, it } from 'vitest'
import { makeCreateTask } from './create-task'
import { InMemoryTaskRepository } from '../testing/in-memory-task-repository'
import { FixedClock, ID, SequentialIdGenerator } from '../testing/fakes'

function setup() {
  const tasks = new InMemoryTaskRepository()
  const createTask = makeCreateTask({
    tasks,
    ids: new SequentialIdGenerator([ID.task]),
    clock: new FixedClock(new Date('2026-06-21T10:00:00.000Z')),
  })
  return { tasks, createTask }
}

describe('createTask', () => {
  it('creates a pending task and persists it', async () => {
    const { tasks, createTask } = setup()

    const view = await createTask({ listId: ID.list, title: 'Buy flowers' })

    expect(view).toMatchObject({
      id: ID.task,
      listId: ID.list,
      title: 'Buy flowers',
      status: 'pending',
      completedAt: null,
    })
    expect(await tasks.listByList(ID.list)).toHaveLength(1)
  })

  it('rejects invalid input', async () => {
    const { createTask } = setup()
    await expect(createTask({ listId: 'nope', title: '' })).rejects.toThrow()
  })
})
