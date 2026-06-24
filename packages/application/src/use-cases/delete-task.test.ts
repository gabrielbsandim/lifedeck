import { describe, expect, it } from 'vitest'
import { ListMember, asEntityId } from '@lifedeck/domain'
import { makeCreateList } from '@/use-cases/create-list'
import { makeCreateTask } from '@/use-cases/create-task'
import { makeDeleteTask } from '@/use-cases/delete-task'
import { ForbiddenError, NotFoundError } from '@/errors/use-case-error'
import { InMemoryListRepository } from '@/testing/in-memory-list-repository'
import { InMemoryTaskRepository } from '@/testing/in-memory-task-repository'
import { InMemoryMembershipRepository } from '@/testing/in-memory-membership-repository'
import { FixedClock, ID, SequentialIdGenerator } from '@/testing/fakes'

const T1 = asEntityId('11111111-1111-4111-8111-111111111111')
const MEMBER_ID = asEntityId('7c9e6679-7425-40de-944b-e07fc1f90ae7')
const NOW = new Date('2026-06-22T10:00:00.000Z')

async function setup() {
  const lists = new InMemoryListRepository()
  const tasks = new InMemoryTaskRepository()
  const memberships = new InMemoryMembershipRepository()
  const clock = new FixedClock(NOW)
  const createList = makeCreateList({
    lists,
    ids: new SequentialIdGenerator([ID.list]),
    clock,
  })
  const createTask = makeCreateTask({
    tasks,
    lists,
    memberships,
    ids: new SequentialIdGenerator([T1]),
    clock,
  })
  const deleteTask = makeDeleteTask({ tasks, lists, memberships })

  await createList(ID.user, { title: 'Wedding' })
  await createTask(ID.user, { listId: ID.list, title: 'First' })

  return { tasks, memberships, deleteTask }
}

describe('deleteTask', () => {
  it('removes a task for the owner', async () => {
    const { tasks, deleteTask } = await setup()

    await deleteTask(ID.user, T1)

    expect(await tasks.listByList(ID.list)).toEqual([])
  })

  it('rejects deleting an unknown task', async () => {
    const { deleteTask } = await setup()
    await expect(deleteTask(ID.user, T1.replace('1', '9'))).rejects.toThrow(
      NotFoundError,
    )
  })

  it('hides the task from a requester without access', async () => {
    const { deleteTask } = await setup()
    await expect(deleteTask(ID.otherUser, T1)).rejects.toThrow(NotFoundError)
  })

  it('forbids a viewer from deleting a task', async () => {
    const { deleteTask, memberships } = await setup()
    await memberships.save(
      ListMember.create({
        id: MEMBER_ID,
        listId: ID.list,
        userId: ID.otherUser,
        role: 'viewer',
        addedAt: NOW,
      }),
    )

    await expect(deleteTask(ID.otherUser, T1)).rejects.toThrow(ForbiddenError)
  })
})
