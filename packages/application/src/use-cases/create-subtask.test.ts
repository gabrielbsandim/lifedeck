import { describe, expect, it } from 'vitest'
import { List, Task } from '@lifedeck/domain'
import { makeCreateSubtask } from '@/use-cases/create-subtask'
import { ForbiddenError, NotFoundError } from '@/errors/use-case-error'
import { InMemorySubtaskRepository } from '@/testing/in-memory-subtask-repository'
import { InMemoryTaskRepository } from '@/testing/in-memory-task-repository'
import { InMemoryListRepository } from '@/testing/in-memory-list-repository'
import { InMemoryMembershipRepository } from '@/testing/in-memory-membership-repository'
import { FixedClock, ID, SequentialIdGenerator } from '@/testing/fakes'

const NOW = new Date('2026-06-21T10:00:00.000Z')

function makeList(visibility: 'private' | 'link' = 'private') {
  return List.create({
    id: ID.list,
    ownerId: ID.user,
    title: 'Project',
    type: 'standalone',
    visibility,
    referenceDate: null,
    createdAt: NOW,
  })
}

function makeTask() {
  return Task.create({
    id: ID.task,
    listId: ID.list,
    title: 'Implement users screen',
    createdAt: NOW,
  })
}

function setup() {
  const subtasks = new InMemorySubtaskRepository()
  const tasks = new InMemoryTaskRepository()
  const lists = new InMemoryListRepository()
  const memberships = new InMemoryMembershipRepository()
  const createSubtask = makeCreateSubtask({
    subtasks,
    tasks,
    lists,
    memberships,
    ids: new SequentialIdGenerator([ID.subtask, ID.subtaskB]),
    clock: new FixedClock(NOW),
  })
  return { subtasks, tasks, lists, memberships, createSubtask }
}

describe('createSubtask', () => {
  it('creates a subtask under a task in a list the user owns', async () => {
    const { subtasks, lists, tasks, createSubtask } = setup()
    await lists.save(makeList())
    await tasks.save(makeTask())

    const view = await createSubtask(ID.user, ID.task, { title: 'Design form' })

    expect(view).toMatchObject({
      id: ID.subtask,
      taskId: ID.task,
      title: 'Design form',
      status: 'pending',
      position: 0,
    })
    expect(await subtasks.listByTask(ID.task)).toHaveLength(1)
  })

  it('appends new subtasks at the end', async () => {
    const { createSubtask, lists, tasks } = setup()
    await lists.save(makeList())
    await tasks.save(makeTask())

    await createSubtask(ID.user, ID.task, { title: 'First' })
    const second = await createSubtask(ID.user, ID.task, { title: 'Second' })

    expect(second.position).toBe(1)
  })

  it('reopens a completed parent task when a new subtask is added', async () => {
    const { createSubtask, lists, tasks } = setup()
    await lists.save(makeList())
    const task = makeTask()
    task.complete(NOW)
    await tasks.save(task)

    await createSubtask(ID.user, ID.task, { title: 'More work' })

    const reloaded = await tasks.findById(ID.task)
    expect(reloaded?.isCompleted).toBe(false)
  })

  it('hides a missing task as NotFound', async () => {
    const { createSubtask } = setup()
    await expect(
      createSubtask(ID.user, ID.task, { title: 'X' }),
    ).rejects.toThrow(NotFoundError)
  })

  it('hides a task whose list is missing as NotFound', async () => {
    const { createSubtask, tasks } = setup()
    await tasks.save(makeTask())
    await expect(
      createSubtask(ID.user, ID.task, { title: 'X' }),
    ).rejects.toThrow(NotFoundError)
  })

  it('hides a task in a list the user cannot read as NotFound', async () => {
    const { createSubtask, lists, tasks } = setup()
    await lists.save(makeList())
    await tasks.save(makeTask())
    await expect(
      createSubtask(ID.otherUser, ID.task, { title: 'X' }),
    ).rejects.toThrow(NotFoundError)
  })

  it('forbids editing a link-shared list the user does not own', async () => {
    const { createSubtask, lists, tasks } = setup()
    await lists.save(makeList('link'))
    await tasks.save(makeTask())
    await expect(
      createSubtask(ID.otherUser, ID.task, { title: 'X' }),
    ).rejects.toThrow(ForbiddenError)
  })
})
