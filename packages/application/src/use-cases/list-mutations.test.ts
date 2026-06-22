import { describe, expect, it } from 'vitest'
import { makeCreateList } from '@/use-cases/create-list'
import { makeRenameList } from '@/use-cases/rename-list'
import { makeDeleteList } from '@/use-cases/delete-list'
import { ForbiddenError, NotFoundError } from '@/errors/use-case-error'
import { InMemoryListRepository } from '@/testing/in-memory-list-repository'
import { FixedClock, ID, SequentialIdGenerator } from '@/testing/fakes'

const UNKNOWN = '00000000-0000-4000-8000-000000000000'

function setup() {
  const lists = new InMemoryListRepository()
  const clock = new FixedClock(new Date('2026-06-22T10:00:00.000Z'))
  return {
    lists,
    createList: makeCreateList({
      lists,
      ids: new SequentialIdGenerator([ID.list]),
      clock,
    }),
    renameList: makeRenameList({ lists, clock }),
    deleteList: makeDeleteList({ lists }),
  }
}

describe('renameList', () => {
  it('renames a list owned by the requester', async () => {
    const ctx = setup()
    await ctx.createList(ID.user, { title: 'Wedding' })
    const view = await ctx.renameList(ID.user, ID.list, { title: 'Honeymoon' })
    expect(view.title).toBe('Honeymoon')
  })

  it('rejects a non-owner', async () => {
    const ctx = setup()
    await ctx.createList(ID.user, { title: 'Wedding' })
    await expect(
      ctx.renameList(ID.otherUser, ID.list, { title: 'Hijack' }),
    ).rejects.toThrow(ForbiddenError)
  })

  it('throws when the list is missing', async () => {
    const ctx = setup()
    await expect(
      ctx.renameList(ID.user, UNKNOWN, { title: 'Ghost' }),
    ).rejects.toThrow(NotFoundError)
  })

  it('rejects an empty title', async () => {
    const ctx = setup()
    await ctx.createList(ID.user, { title: 'Wedding' })
    await expect(
      ctx.renameList(ID.user, ID.list, { title: '  ' }),
    ).rejects.toThrow()
  })
})

describe('deleteList', () => {
  it('deletes a list owned by the requester', async () => {
    const ctx = setup()
    await ctx.createList(ID.user, { title: 'Wedding' })
    await ctx.deleteList(ID.user, ID.list)
    expect(await ctx.lists.findById(ID.list)).toBeNull()
  })

  it('rejects a non-owner', async () => {
    const ctx = setup()
    await ctx.createList(ID.user, { title: 'Wedding' })
    await expect(ctx.deleteList(ID.otherUser, ID.list)).rejects.toThrow(
      ForbiddenError,
    )
  })

  it('throws when the list is missing', async () => {
    const ctx = setup()
    await expect(ctx.deleteList(ID.user, UNKNOWN)).rejects.toThrow(
      NotFoundError,
    )
  })
})
