import { describe, expect, it } from 'vitest'
import { List } from '@taskin/domain'
import { makeCreateTask } from '@/use-cases/create-task'
import { makeListListTasks } from '@/use-cases/list-list-tasks'
import { NotFoundError } from '@/errors/use-case-error'
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
  return {
    lists,
    memberships,
    createTask,
    listListTasks: makeListListTasks({ tasks, lists, memberships }),
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
})
