import { describe, expect, it } from 'vitest'
import { makeCompleteTask } from './complete-task'
import { makeCreateTask } from './create-task'
import { NotFoundError } from '../errors/use-case-error'
import { InMemoryTaskRepository } from '../testing/in-memory-task-repository'
import { FixedClock, ID, SequentialIdGenerator } from '../testing/fakes'

function setup() {
  const tasks = new InMemoryTaskRepository()
  const clock = new FixedClock(new Date('2026-06-21T10:00:00.000Z'))
  const createTask = makeCreateTask({
    tasks,
    ids: new SequentialIdGenerator([ID.task]),
    clock,
  })
  const completeTask = makeCompleteTask({ tasks, clock })
  return { createTask, completeTask }
}

describe('completeTask', () => {
  it('marks an existing task as completed', async () => {
    const { createTask, completeTask } = setup()
    await createTask({ listId: ID.list, title: 'Buy flowers' })

    const view = await completeTask(ID.task)

    expect(view.status).toBe('completed')
    expect(view.completedAt).toBe('2026-06-21T10:00:00.000Z')
  })

  it('throws NotFoundError when the task is missing', async () => {
    const { completeTask } = setup()
    await expect(completeTask(ID.task)).rejects.toBeInstanceOf(NotFoundError)
  })
})
