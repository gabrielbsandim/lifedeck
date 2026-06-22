import { describe, expect, it } from 'vitest'
import { ListMember } from '@/entities/list-member'
import { asEntityId } from '@/shared/id'

const ID = asEntityId('3f2504e0-4f89-41d3-9a0c-0305e82c3301')
const LIST = asEntityId('1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed')
const USER = asEntityId('a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f')
const ADDED_AT = new Date('2026-06-21T10:00:00.000Z')

function create(role: 'editor' | 'viewer' = 'viewer') {
  return ListMember.create({
    id: ID,
    listId: LIST,
    userId: USER,
    role,
    addedAt: ADDED_AT,
  })
}

describe('ListMember', () => {
  it('creates a member with its role', () => {
    const member = create('editor')
    expect(member.id).toBe(ID)
    expect(member.listId).toBe(LIST)
    expect(member.userId).toBe(USER)
    expect(member.role).toBe('editor')
    expect(member.isEditor).toBe(true)
  })

  it('reports non-editors', () => {
    expect(create('viewer').isEditor).toBe(false)
  })

  it('changes the role', () => {
    const member = create('viewer')
    member.changeRole('editor')
    expect(member.role).toBe('editor')
  })

  it('restores from persisted props', () => {
    const props = create().toJSON()
    expect(ListMember.restore(props).toJSON()).toEqual(props)
  })
})
