import { describe, expect, it } from 'vitest'
import { List } from '@taskin/domain'
import { makeCreateTask } from '@/use-cases/create-task'
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

function setup() {
  const tasks = new InMemoryTaskRepository()
  const lists = new InMemoryListRepository()
  const memberships = new InMemoryMembershipRepository()
  const createTask = makeCreateTask({
    tasks,
    lists,
    memberships,
    ids: new SequentialIdGenerator([ID.task]),
    clock: new FixedClock(NOW),
  })
  return { tasks, lists, memberships, createTask }
}

describe('createTask', () => {
  it('creates a task in a list the user owns', async () => {
    const { tasks, lists, createTask } = setup()
    await lists.save(makeList())

    const view = await createTask(ID.user, {
      listId: ID.list,
      title: 'Buy flowers',
    })

    expect(view).toMatchObject({
      id: ID.task,
      listId: ID.list,
      title: 'Buy flowers',
      status: 'pending',
    })
    expect(await tasks.listByList(ID.list)).toHaveLength(1)
  })

  it('hides a missing or private list as NotFound', async () => {
    const { lists, createTask } = setup()
    await lists.save(makeList())

    await expect(
      createTask(ID.otherUser, { listId: ID.list, title: 'X' }),
    ).rejects.toThrow(NotFoundError)
    await expect(
      createTask(ID.user, { listId: ID.task, title: 'X' }),
    ).rejects.toThrow(NotFoundError)
  })

  it('forbids editing a link-shared list owned by someone else', async () => {
    const { lists, createTask } = setup()
    await lists.save(makeList('link'))

    await expect(
      createTask(ID.otherUser, { listId: ID.list, title: 'X' }),
    ).rejects.toThrow(ForbiddenError)
  })

  it('rejects invalid input', async () => {
    const { lists, createTask } = setup()
    await lists.save(makeList())
    await expect(
      createTask(ID.user, { listId: ID.list, title: '' }),
    ).rejects.toThrow()
  })
})
