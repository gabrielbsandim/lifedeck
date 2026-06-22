import { describe, expect, it } from 'vitest'
import { ShareLink } from '@/entities/share-link'
import { asEntityId } from '@/shared/id'
import { ValidationError } from '@/shared/domain-error'

const ID = asEntityId('3f2504e0-4f89-41d3-9a0c-0305e82c3301')
const LIST = asEntityId('1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed')
const CREATED_AT = new Date('2026-06-21T10:00:00.000Z')

function create(expiresAt: Date | null = null) {
  return ShareLink.create({
    id: ID,
    listId: LIST,
    token: 'secret-token',
    role: 'viewer',
    expiresAt,
    createdAt: CREATED_AT,
  })
}

describe('ShareLink', () => {
  it('creates a link with its token and role', () => {
    const link = create()
    expect(link.id).toBe(ID)
    expect(link.listId).toBe(LIST)
    expect(link.token).toBe('secret-token')
    expect(link.role).toBe('viewer')
  })

  it('rejects an empty token', () => {
    expect(() =>
      ShareLink.create({
        id: ID,
        listId: LIST,
        token: '  ',
        role: 'viewer',
        expiresAt: null,
        createdAt: CREATED_AT,
      }),
    ).toThrow(ValidationError)
  })

  it('never expires without an expiry date', () => {
    expect(create(null).isExpired(new Date('2030-01-01T00:00:00.000Z'))).toBe(
      false,
    )
  })

  it('expires after its expiry date', () => {
    const link = create(new Date('2026-06-22T00:00:00.000Z'))
    expect(link.isExpired(new Date('2026-06-21T12:00:00.000Z'))).toBe(false)
    expect(link.isExpired(new Date('2026-06-23T00:00:00.000Z'))).toBe(true)
  })

  it('restores from persisted props', () => {
    const props = create().toJSON()
    expect(ShareLink.restore(props).toJSON()).toEqual(props)
  })
})
