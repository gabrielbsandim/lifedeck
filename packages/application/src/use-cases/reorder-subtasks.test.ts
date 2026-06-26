import { describe, expect, it } from 'vitest'
import { List, Subtask, Task } from '@lifedeck/domain'
import { makeReorderSubtasks } from '@/use-cases/reorder-subtasks'
import { ForbiddenError, NotFoundError } from '@/errors/use-case-error'
import { InMemorySubtaskRepository } from '@/testing/in-memory-subtask-repository'
import { InMemoryTaskRepository } from '@/testing/in-memory-task-repository'
import { InMemoryListRepository } from '@/testing/in-memory-list-repository'
import { InMemoryMembershipRepository } from '@/testing/in-memory-membership-repository'
import { FakeUnitOfWork, ID } from '@/testing/fakes'

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
  const reorderSubtasks = makeReorderSubtasks({
    subtasks,
    tasks,
    lists,
    memberships,
    unitOfWork: new FakeUnitOfWork(),
  })
  return { subtasks, tasks, lists, memberships, reorderSubtasks }
}

async function seed(ctx: ReturnType<typeof setup>) {
  await ctx.lists.save(makeList())
  await ctx.tasks.save(makeTask())
  await ctx.subtasks.save(makeSubtask(ID.subtask, 0))
  await ctx.subtasks.save(makeSubtask(ID.subtaskB, 1))
}

describe('reorderSubtasks', () => {
  it('reorders subtasks by the provided id sequence', async () => {
    const ctx = setup()
    await seed(ctx)

    const views = await ctx.reorderSubtasks(ID.user, ID.task, {
      subtaskIds: [ID.subtaskB, ID.subtask],
    })

    expect(views.map(view => view.id)).toEqual([ID.subtaskB, ID.subtask])
  })

  it('ignores unknown ids in the sequence', async () => {
    const ctx = setup()
    await seed(ctx)

    const views = await ctx.reorderSubtasks(ID.user, ID.task, {
      subtaskIds: [ID.subtaskB, ID.verification, ID.subtask],
    })

    expect(views.map(view => view.id)).toEqual([ID.subtaskB, ID.subtask])
  })

  it('hides a missing task as NotFound', async () => {
    const ctx = setup()
    await expect(
      ctx.reorderSubtasks(ID.user, ID.task, { subtaskIds: [] }),
    ).rejects.toThrow(NotFoundError)
  })

  it('hides a task whose list is missing as NotFound', async () => {
    const ctx = setup()
    await ctx.tasks.save(makeTask())
    await expect(
      ctx.reorderSubtasks(ID.user, ID.task, { subtaskIds: [] }),
    ).rejects.toThrow(NotFoundError)
  })

  it('hides a task the user cannot read as NotFound', async () => {
    const ctx = setup()
    await seed(ctx)
    await expect(
      ctx.reorderSubtasks(ID.otherUser, ID.task, { subtaskIds: [] }),
    ).rejects.toThrow(NotFoundError)
  })

  it('forbids reordering in a link-shared list the user does not own', async () => {
    const ctx = setup()
    await ctx.lists.save(makeList('link'))
    await ctx.tasks.save(makeTask())
    await expect(
      ctx.reorderSubtasks(ID.otherUser, ID.task, { subtaskIds: [] }),
    ).rejects.toThrow(ForbiddenError)
  })
})
