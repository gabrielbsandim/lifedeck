import { describe, expect, it } from 'vitest'
import { List, ListMember, Task, ValidationError } from '@taskin/domain'
import { makeCreateTask } from '@/use-cases/create-task'
import { makeUpdateTask } from '@/use-cases/update-task'
import { ForbiddenError, NotFoundError } from '@/errors/use-case-error'
import { InMemoryTaskRepository } from '@/testing/in-memory-task-repository'
import { InMemoryListRepository } from '@/testing/in-memory-list-repository'
import { InMemoryMembershipRepository } from '@/testing/in-memory-membership-repository'
import { FixedClock, ID, SequentialIdGenerator } from '@/testing/fakes'

const NOW = new Date('2026-06-21T10:00:00.000Z')

function makeList(visibility: 'private' | 'link' = 'private') {
  return List.create({
    id: ID.list,
    ownerId: ID.user,
    title: 'Wedding',
    type: 'standalone',
    visibility,
    referenceDate: null,
    createdAt: NOW,
  })
}

async function setup(visibility: 'private' | 'link' = 'private') {
  const tasks = new InMemoryTaskRepository()
  const lists = new InMemoryListRepository()
  const memberships = new InMemoryMembershipRepository()
  await lists.save(makeList(visibility))
  const createTask = makeCreateTask({
    tasks,
    lists,
    memberships,
    ids: new SequentialIdGenerator([ID.task]),
    clock: new FixedClock(NOW),
  })
  await createTask(ID.user, { listId: ID.list, title: 'Buy flowers' })
  return {
    memberships,
    updateTask: makeUpdateTask({
      tasks,
      lists,
      memberships,
      clock: new FixedClock(NOW),
    }),
  }
}

describe('updateTask', () => {
  it('completes and reopens a task', async () => {
    const { updateTask } = await setup()

    const done = await updateTask(ID.user, ID.task, { status: 'completed' })
    expect(done).toMatchObject({
      status: 'completed',
      completedAt: NOW.toISOString(),
    })

    const reopened = await updateTask(ID.user, ID.task, { status: 'pending' })
    expect(reopened).toMatchObject({ status: 'pending', completedAt: null })
  })

  it('renames and sets an observation', async () => {
    const { updateTask } = await setup()

    const view = await updateTask(ID.user, ID.task, {
      title: 'Buy roses',
      observation: 'Red ones',
    })

    expect(view).toMatchObject({ title: 'Buy roses', observation: 'Red ones' })
  })

  it('toggles privacy', async () => {
    const { updateTask } = await setup()
    const view = await updateTask(ID.user, ID.task, { isPrivate: true })
    expect(view.isPrivate).toBe(true)
  })

  it('assigns to the owner and unassigns', async () => {
    const { updateTask } = await setup()

    const assigned = await updateTask(ID.user, ID.task, { assigneeId: ID.user })
    expect(assigned.assigneeId).toBe(ID.user)

    const cleared = await updateTask(ID.user, ID.task, { assigneeId: null })
    expect(cleared.assigneeId).toBeNull()
  })

  it('assigns to a member of the list', async () => {
    const { updateTask, memberships } = await setup()
    await memberships.save(
      ListMember.create({
        id: ID.list,
        listId: ID.list,
        userId: ID.otherUser,
        role: 'editor',
        addedAt: NOW,
      }),
    )

    const view = await updateTask(ID.user, ID.task, {
      assigneeId: ID.otherUser,
    })
    expect(view.assigneeId).toBe(ID.otherUser)
  })

  it('rejects assigning to a non-member', async () => {
    const { updateTask } = await setup()
    await expect(
      updateTask(ID.user, ID.task, { assigneeId: ID.otherUser }),
    ).rejects.toThrow(ValidationError)
  })

  it('throws NotFound for a missing task', async () => {
    const { updateTask } = await setup()
    await expect(updateTask(ID.user, ID.user, { title: 'X' })).rejects.toThrow(
      NotFoundError,
    )
  })

  it('throws NotFound when the task list no longer exists', async () => {
    const tasks = new InMemoryTaskRepository()
    const lists = new InMemoryListRepository()
    const memberships = new InMemoryMembershipRepository()
    await tasks.save(
      Task.create({
        id: ID.task,
        listId: ID.list,
        title: 'Orphan',
        createdAt: NOW,
      }),
    )
    const updateTask = makeUpdateTask({
      tasks,
      lists,
      memberships,
      clock: new FixedClock(NOW),
    })
    await expect(updateTask(ID.user, ID.task, { title: 'X' })).rejects.toThrow(
      NotFoundError,
    )
  })

  it('hides the task from non-owners of a private list', async () => {
    const { updateTask } = await setup()
    await expect(
      updateTask(ID.otherUser, ID.task, { title: 'X' }),
    ).rejects.toThrow(NotFoundError)
  })

  it('forbids editing on a link-shared list owned by someone else', async () => {
    const { updateTask } = await setup('link')
    await expect(
      updateTask(ID.otherUser, ID.task, { title: 'X' }),
    ).rejects.toThrow(ForbiddenError)
  })
})
