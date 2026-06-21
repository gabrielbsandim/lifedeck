import { describe, expect, it } from 'vitest'
import { makeCreateList } from '@/use-cases/create-list'
import { InMemoryListRepository } from '@/testing/in-memory-list-repository'
import { FixedClock, ID, SequentialIdGenerator } from '@/testing/fakes'

function setup() {
  const lists = new InMemoryListRepository()
  const createList = makeCreateList({
    lists,
    ids: new SequentialIdGenerator([ID.list]),
    clock: new FixedClock(new Date('2026-06-21T10:00:00.000Z')),
  })
  return { lists, createList }
}

describe('createList', () => {
  it('creates a standalone private list by default', async () => {
    const { lists, createList } = setup()

    const view = await createList(ID.user, { title: 'Wedding' })

    expect(view).toMatchObject({
      id: ID.list,
      ownerId: ID.user,
      title: 'Wedding',
      type: 'standalone',
      visibility: 'private',
      referenceDate: null,
    })
    expect(await lists.listByOwner(ID.user)).toHaveLength(1)
  })

  it('creates a daily list with a reference date', async () => {
    const { createList } = setup()

    const view = await createList(ID.user, {
      title: 'Today',
      type: 'daily',
      referenceDate: '2026-06-21',
    })

    expect(view.type).toBe('daily')
    expect(view.referenceDate).toBe('2026-06-21')
  })

  it('rejects an invalid payload', async () => {
    const { createList } = setup()
    await expect(createList(ID.user, { title: '' })).rejects.toThrow()
  })
})
