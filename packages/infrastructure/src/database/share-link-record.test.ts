import { describe, expect, it } from 'vitest'
import {
  toDomainShareLink,
  toShareLinkRecord,
  type ShareLinkRecord,
} from '@/database/share-link-record'

const RECORD: ShareLinkRecord = {
  id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  listId: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
  token: 'secret-token',
  role: 'viewer',
  expiresAt: new Date('2026-06-23T10:00:00.000Z'),
  createdAt: new Date('2026-06-21T10:00:00.000Z'),
}

describe('share-link-record mapping', () => {
  it('round-trips a record through the domain entity', () => {
    const link = toDomainShareLink(RECORD)
    expect(toShareLinkRecord(link)).toEqual(RECORD)
  })

  it('maps a link without expiry', () => {
    const link = toDomainShareLink({ ...RECORD, expiresAt: null })
    expect(toShareLinkRecord(link).expiresAt).toBeNull()
  })
})
