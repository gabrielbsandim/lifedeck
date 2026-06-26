import { describe, expect, it } from 'vitest'
import { List, Subtask, Task } from '@lifedeck/domain'
import { makeListSubtasks } from '@/use-cases/list-subtasks'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemorySubtaskRepository } from '@/testing/in-memory-subtask-repository'
import { InMemoryTaskRepository } from '@/testing/in-memory-task-repository'
import { InMemoryListRepository } from '@/testing/in-memory-list-repository'
import { InMemoryMembershipRepository } from '@/testing/in-memory-membership-repository'
import { ID } from '@/testing/fakes'

const NOW = new Date('2026-06-21T10:00:00.000Z')

function makeList() {
  return List.create({
    id: ID.list,
    ownerId: ID.user,
    title: 'Project',
    type: 'standalone',
    visibility: 'private',
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

function makeSubtask(id: typeof ID.subtask, position: number) {
  return Subtask.create({
    id,
    taskId: ID.task,
    title: 'Step',
    position,
    createdAt: NOW,
  })
}

function setup() {
  const subtasks = new InMemorySubtaskRepository()
  const tasks = new InMemoryTaskRepository()
  const lists = new InMemoryListRepository()
  const memberships = new InMemoryMembershipRepository()
  const listSubtasks = makeListSubtasks({ subtasks, tasks, lists, memberships })
  return { subtasks, tasks, lists, memberships, listSubtasks }
}

describe('listSubtasks', () => {
  it('returns subtasks ordered by position', async () => {
    const { subtasks, tasks, lists, listSubtasks } = setup()
    await lists.save(makeList())
    await tasks.save(makeTask())
    await subtasks.save(makeSubtask(ID.subtaskB, 1))
    await subtasks.save(makeSubtask(ID.subtask, 0))

    const views = await listSubtasks(ID.user, ID.task)

    expect(views.map(view => view.id)).toEqual([ID.subtask, ID.subtaskB])
  })

  it('hides a missing task as NotFound', async () => {
    const { listSubtasks } = setup()
    await expect(listSubtasks(ID.user, ID.task)).rejects.toThrow(NotFoundError)
  })

  it('hides a task whose list is missing as NotFound', async () => {
    const { tasks, listSubtasks } = setup()
    await tasks.save(makeTask())
    await expect(listSubtasks(ID.user, ID.task)).rejects.toThrow(NotFoundError)
  })

  it('hides a task the user cannot read as NotFound', async () => {
    const { tasks, lists, listSubtasks } = setup()
    await lists.save(makeList())
    await tasks.save(makeTask())
    await expect(listSubtasks(ID.otherUser, ID.task)).rejects.toThrow(
      NotFoundError,
    )
  })
})
