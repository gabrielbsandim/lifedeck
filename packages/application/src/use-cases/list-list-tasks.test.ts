import { describe, expect, it } from 'vitest'
import { List, ListMember, Task, asEntityId } from '@lifedeck/domain'
import { makeCreateTask } from '@/use-cases/create-task'
import { makeListListTasks } from '@/use-cases/list-list-tasks'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryTaskRepository } from '@/testing/in-memory-task-repository'
import { InMemorySubtaskRepository } from '@/testing/in-memory-subtask-repository'
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
  const subtasks = new InMemorySubtaskRepository()
  const lists = new InMemoryListRepository()
  const memberships = new InMemoryMembershipRepository()
  const createTask = makeCreateTask({
    tasks,
    lists,
    memberships,
    ids: new SequentialIdGenerator([ID.task]),
    clock: new FixedClock(NOW),
  })
  return {
    tasks,
    lists,
    memberships,
    createTask,
    listListTasks: makeListListTasks({ tasks, subtasks, lists, memberships }),
  }
}

describe('listListTasks', () => {
  it('returns the tasks of a list the user owns', async () => {
    const { lists, createTask, listListTasks } = setup()
    await lists.save(makeList())
    await createTask(ID.user, { listId: ID.list, title: 'Buy flowers' })

    const views = await listListTasks(ID.user, ID.list)

    expect(views).toHaveLength(1)
    expect(views[0]).toMatchObject({ title: 'Buy flowers' })
  })

  it('lets anyone read the tasks of a link-shared list', async () => {
    const { lists, listListTasks } = setup()
    await lists.save(makeList('link'))

    expect(await listListTasks(null, ID.list)).toEqual([])
  })

  it('hides a private list from non-owners', async () => {
    const { lists, listListTasks } = setup()
    await lists.save(makeList())

    await expect(listListTasks(ID.otherUser, ID.list)).rejects.toThrow(
      NotFoundError,
    )
  })

  it('hides private tasks from members but not the owner', async () => {
    const { lists, memberships, tasks, listListTasks } = setup()
    await lists.save(makeList())
    await memberships.save(
      ListMember.create({
        id: ID.user,
        listId: ID.list,
        userId: ID.otherUser,
        role: 'viewer',
        addedAt: NOW,
      }),
    )
    await tasks.save(
      Task.create({
        id: ID.task,
        listId: ID.list,
        title: 'Public',
        createdAt: NOW,
      }),
    )
    const secret = Task.create({
      id: asEntityId('9c858901-8a57-4791-81fe-4c455b099bc9'),
      listId: ID.list,
      title: 'Secret',
      createdAt: NOW,
    })
    secret.setPrivacy(true)
    await tasks.save(secret)

    expect(await listListTasks(ID.user, ID.list)).toHaveLength(2)
    const memberView = await listListTasks(ID.otherUser, ID.list)
    expect(memberView).toHaveLength(1)
    expect(memberView[0]?.title).toBe('Public')
  })
})
