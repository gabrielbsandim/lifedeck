import { describe, expect, it } from 'vitest'
import { makeGetDailyList } from '@/use-cases/get-daily-list'
import { InMemoryListRepository } from '@/testing/in-memory-list-repository'
import { FixedClock, ID, SequentialIdGenerator } from '@/testing/fakes'

function setup() {
  const lists = new InMemoryListRepository()
  const getDailyList = makeGetDailyList({
    lists,
    ids: new SequentialIdGenerator([ID.list, ID.task]),
    clock: new FixedClock(new Date('2026-06-21T10:00:00.000Z')),
  })
  return { lists, getDailyList }
}

describe('getDailyList', () => {
  it('provisions a daily list for the date on first request', async () => {
    const { lists, getDailyList } = setup()

    const view = await getDailyList(ID.user, '2026-06-21')

    expect(view).toMatchObject({
      id: ID.list,
      ownerId: ID.user,
      type: 'daily',
      visibility: 'private',
      referenceDate: '2026-06-21',
    })
    expect(await lists.listByOwner(ID.user)).toHaveLength(1)
  })

  it('returns the same list on subsequent requests for the date', async () => {
    const { lists, getDailyList } = setup()

    const first = await getDailyList(ID.user, '2026-06-21')
    const second = await getDailyList(ID.user, '2026-06-21')

    expect(second.id).toBe(first.id)
    expect(await lists.listByOwner(ID.user)).toHaveLength(1)
  })

  it('provisions a separate list per date', async () => {
    const { getDailyList } = setup()

    const day1 = await getDailyList(ID.user, '2026-06-21')
    const day2 = await getDailyList(ID.user, '2026-06-22')

    expect(day2.id).not.toBe(day1.id)
    expect(day2.referenceDate).toBe('2026-06-22')
  })

  it('rejects a malformed date', async () => {
    const { getDailyList } = setup()
    await expect(getDailyList(ID.user, '21/06/2026')).rejects.toThrow()
  })
})
