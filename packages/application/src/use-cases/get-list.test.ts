import { describe, expect, it } from 'vitest'
import { makeCreateList } from '@/use-cases/create-list'
import { makeGetList } from '@/use-cases/get-list'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryListRepository } from '@/testing/in-memory-list-repository'
import { FixedClock, ID, SequentialIdGenerator } from '@/testing/fakes'

function setup() {
  const lists = new InMemoryListRepository()
  const createList = makeCreateList({
    lists,
    ids: new SequentialIdGenerator([ID.list]),
    clock: new FixedClock(new Date('2026-06-21T10:00:00.000Z')),
  })
  return { lists, createList, getList: makeGetList({ lists }) }
}

describe('getList', () => {
  it('returns a private list to its owner', async () => {
    const { createList, getList } = setup()
    await createList(ID.user, { title: 'Wedding' })

    const view = await getList(ID.list, ID.user)

    expect(view).toMatchObject({ id: ID.list, ownerId: ID.user })
  })

  it('hides a private list from non-owners', async () => {
    const { createList, getList } = setup()
    await createList(ID.user, { title: 'Wedding' })

    await expect(getList(ID.list, ID.otherUser)).rejects.toThrow(NotFoundError)
    await expect(getList(ID.list, null)).rejects.toThrow(NotFoundError)
  })

  it('exposes a link-shared list to anyone', async () => {
    const { createList, getList } = setup()
    await createList(ID.user, { title: 'Wedding', visibility: 'link' })

    const view = await getList(ID.list, null)

    expect(view.visibility).toBe('link')
  })

  it('throws NotFoundError when the list is missing', async () => {
    const { getList } = setup()
    await expect(getList(ID.list, ID.user)).rejects.toThrow(NotFoundError)
  })
})
