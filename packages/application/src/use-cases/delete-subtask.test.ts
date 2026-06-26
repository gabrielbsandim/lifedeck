import { describe, expect, it } from 'vitest'
import { List, Subtask, Task } from '@lifedeck/domain'
import { makeDeleteSubtask } from '@/use-cases/delete-subtask'
import { ForbiddenError, NotFoundError } from '@/errors/use-case-error'
import { InMemorySubtaskRepository } from '@/testing/in-memory-subtask-repository'
import { InMemoryTaskRepository } from '@/testing/in-memory-task-repository'
import { InMemoryListRepository } from '@/testing/in-memory-list-repository'
import { InMemoryMembershipRepository } from '@/testing/in-memory-membership-repository'
import { ID } from '@/testing/fakes'

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

function makeSubtask() {
  return Subtask.create({
    id: ID.subtask,
    taskId: ID.task,
    title: 'Step',
    createdAt: NOW,
  })
}

function setup() {
  const subtasks = new InMemorySubtaskRepository()
  const tasks = new InMemoryTaskRepository()
  const lists = new InMemoryListRepository()
  const memberships = new InMemoryMembershipRepository()
  const deleteSubtask = makeDeleteSubtask({
    subtasks,
    tasks,
    lists,
    memberships,
  })
  return { subtasks, tasks, lists, memberships, deleteSubtask }
}

describe('deleteSubtask', () => {
  it('removes a subtask the user owns', async () => {
    const { subtasks, tasks, lists, deleteSubtask } = setup()
    await lists.save(makeList())
    await tasks.save(makeTask())
    await subtasks.save(makeSubtask())

    await deleteSubtask(ID.user, ID.subtask)

    expect(await subtasks.listByTask(ID.task)).toHaveLength(0)
  })

  it('hides a missing subtask as NotFound', async () => {
    const { deleteSubtask } = setup()
    await expect(deleteSubtask(ID.user, ID.subtask)).rejects.toThrow(
      NotFoundError,
    )
  })

  it('hides a subtask whose parent task is missing as NotFound', async () => {
    const { subtasks, deleteSubtask } = setup()
    await subtasks.save(makeSubtask())
    await expect(deleteSubtask(ID.user, ID.subtask)).rejects.toThrow(
      NotFoundError,
    )
  })

  it('hides a subtask whose list is missing as NotFound', async () => {
    const { subtasks, tasks, deleteSubtask } = setup()
    await tasks.save(makeTask())
    await subtasks.save(makeSubtask())
    await expect(deleteSubtask(ID.user, ID.subtask)).rejects.toThrow(
      NotFoundError,
    )
  })

  it('hides a subtask the user cannot read as NotFound', async () => {
    const { subtasks, tasks, lists, deleteSubtask } = setup()
    await lists.save(makeList())
    await tasks.save(makeTask())
    await subtasks.save(makeSubtask())
    await expect(deleteSubtask(ID.otherUser, ID.subtask)).rejects.toThrow(
      NotFoundError,
    )
  })

  it('forbids deleting in a link-shared list the user does not own', async () => {
    const { subtasks, tasks, lists, deleteSubtask } = setup()
    await lists.save(makeList('link'))
    await tasks.save(makeTask())
    await subtasks.save(makeSubtask())
    await expect(deleteSubtask(ID.otherUser, ID.subtask)).rejects.toThrow(
      ForbiddenError,
    )
  })
})
