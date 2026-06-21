import { describe, expect, it } from 'vitest'
import { makeCreateList } from '@/use-cases/create-list'
import { makeListUserLists } from '@/use-cases/list-user-lists'
import { InMemoryListRepository } from '@/testing/in-memory-list-repository'
import { FixedClock, ID, SequentialIdGenerator } from '@/testing/fakes'

function setup() {
  const lists = new InMemoryListRepository()
  const createList = makeCreateList({
    lists,
    ids: new SequentialIdGenerator([ID.list, ID.task]),
    clock: new FixedClock(new Date('2026-06-21T10:00:00.000Z')),
  })
  return { createList, listUserLists: makeListUserLists({ lists }) }
}

describe('listUserLists', () => {
  it('returns only the lists owned by the user', async () => {
    const { createList, listUserLists } = setup()
    await createList(ID.user, { title: 'Wedding' })
    await createList(ID.otherUser, { title: 'Work' })

    const views = await listUserLists(ID.user)

    expect(views).toHaveLength(1)
    expect(views[0]).toMatchObject({ ownerId: ID.user, title: 'Wedding' })
  })

  it('returns an empty array when the user has no lists', async () => {
    const { listUserLists } = setup()
    expect(await listUserLists(ID.user)).toEqual([])
  })
})
