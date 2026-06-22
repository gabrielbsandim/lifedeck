import { describe, expect, it } from 'vitest'
import { List } from '@taskin/domain'
import { canEditList, canReadList } from '@/access/list-access'
import { ID } from '@/testing/fakes'

function makeList(visibility: 'private' | 'link' = 'private') {
  return List.create({
    id: ID.list,
    ownerId: ID.user,
    title: 'Wedding',
    type: 'standalone',
    visibility,
    referenceDate: null,
    createdAt: new Date('2026-06-21T10:00:00.000Z'),
  })
}

describe('list access', () => {
  it('lets the owner read and edit', () => {
    const list = makeList()
    expect(canReadList(list, ID.user)).toBe(true)
    expect(canEditList(list, ID.user)).toBe(true)
  })

  it('hides a private list from non-owners', () => {
    const list = makeList()
    expect(canReadList(list, ID.otherUser)).toBe(false)
    expect(canReadList(list, null)).toBe(false)
  })

  it('lets anyone read a link-shared list but not edit it', () => {
    const list = makeList('link')
    expect(canReadList(list, null)).toBe(true)
    expect(canReadList(list, ID.otherUser)).toBe(true)
    expect(canEditList(list, ID.otherUser)).toBe(false)
    expect(canEditList(list, null)).toBe(false)
  })
})
