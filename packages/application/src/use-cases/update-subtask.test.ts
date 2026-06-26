import { beforeEach, describe, expect, it } from 'vitest'
import { List, Subtask, Task } from '@lifedeck/domain'
import { makeUpdateSubtask } from '@/use-cases/update-subtask'
import { ForbiddenError, NotFoundError } from '@/errors/use-case-error'
import { InMemorySubtaskRepository } from '@/testing/in-memory-subtask-repository'
import { InMemoryTaskRepository } from '@/testing/in-memory-task-repository'
import { InMemoryListRepository } from '@/testing/in-memory-list-repository'
import { InMemoryMembershipRepository } from '@/testing/in-memory-membership-repository'
import { FixedClock, ID } from '@/testing/fakes'

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

function makeSubtask(id = ID.subtask, position = 0) {
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
  const updateSubtask = makeUpdateSubtask({
    subtasks,
    tasks,
    lists,
    memberships,
    clock: new FixedClock(NOW),
  })
  return { subtasks, tasks, lists, memberships, updateSubtask }
}

describe('updateSubtask', () => {
  let ctx: ReturnType<typeof setup>

  beforeEach(async () => {
    ctx = setup()
    await ctx.lists.save(makeList())
    await ctx.tasks.save(makeTask())
  })

  it('renames a subtask', async () => {
    await ctx.subtasks.save(makeSubtask())

    const view = await ctx.updateSubtask(ID.user, ID.subtask, {
      title: 'Renamed step',
    })

    expect(view.title).toBe('Renamed step')
  })

  it('marks a subtask completed', async () => {
    await ctx.subtasks.save(makeSubtask())

    const view = await ctx.updateSubtask(ID.user, ID.subtask, {
      status: 'completed',
    })

    expect(view.status).toBe('completed')
    expect(view.completedAt).not.toBeNull()
  })

  it('auto-completes the parent task when the last subtask is completed', async () => {
    await ctx.subtasks.save(makeSubtask(ID.subtask, 0))

    await ctx.updateSubtask(ID.user, ID.subtask, { status: 'completed' })

    const task = await ctx.tasks.findById(ID.task)
    expect(task?.isCompleted).toBe(true)
  })

  it('does not auto-complete while a sibling is still pending', async () => {
    await ctx.subtasks.save(makeSubtask(ID.subtask, 0))
    await ctx.subtasks.save(makeSubtask(ID.subtaskB, 1))

    await ctx.updateSubtask(ID.user, ID.subtask, { status: 'completed' })

    const task = await ctx.tasks.findById(ID.task)
    expect(task?.isCompleted).toBe(false)
  })

  it('reopens an auto-completed parent when a subtask is reopened', async () => {
    const done = makeSubtask(ID.subtask, 0)
    done.complete(NOW)
    await ctx.subtasks.save(done)
    const task = makeTask()
    task.complete(NOW)
    await ctx.tasks.save(task)

    await ctx.updateSubtask(ID.user, ID.subtask, { status: 'pending' })

    const reloaded = await ctx.tasks.findById(ID.task)
    expect(reloaded?.isCompleted).toBe(false)
  })

  it('leaves the parent untouched when only renaming', async () => {
    await ctx.subtasks.save(makeSubtask())
    const task = makeTask()
    task.complete(NOW)
    await ctx.tasks.save(task)

    await ctx.updateSubtask(ID.user, ID.subtask, { title: 'New name' })

    const reloaded = await ctx.tasks.findById(ID.task)
    expect(reloaded?.isCompleted).toBe(true)
  })

  it('hides a missing subtask as NotFound', async () => {
    await expect(
      ctx.updateSubtask(ID.user, ID.subtask, { title: 'X' }),
    ).rejects.toThrow(NotFoundError)
  })

  it('hides a subtask whose parent task is missing as NotFound', async () => {
    const orphan = Subtask.create({
      id: ID.subtask,
      taskId: ID.subtaskB,
      title: 'Orphan',
      createdAt: NOW,
    })
    await ctx.subtasks.save(orphan)
    await expect(
      ctx.updateSubtask(ID.user, ID.subtask, { title: 'X' }),
    ).rejects.toThrow(NotFoundError)
  })

  it('hides a subtask the user cannot read as NotFound', async () => {
    await ctx.subtasks.save(makeSubtask())
    await expect(
      ctx.updateSubtask(ID.otherUser, ID.subtask, { title: 'X' }),
    ).rejects.toThrow(NotFoundError)
  })

  it('forbids editing a link-shared list the user does not own', async () => {
    ctx = setup()
    await ctx.lists.save(makeList('link'))
    await ctx.tasks.save(makeTask())
    await ctx.subtasks.save(makeSubtask())
    await expect(
      ctx.updateSubtask(ID.otherUser, ID.subtask, { title: 'X' }),
    ).rejects.toThrow(ForbiddenError)
  })
})
