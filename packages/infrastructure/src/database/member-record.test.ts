import { describe, expect, it } from 'vitest'
import {
  toDomainMember,
  toMemberRecord,
  type MemberRecord,
} from '@/database/member-record'

const RECORD: MemberRecord = {
  id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  listId: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
  userId: 'a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f',
  role: 'editor',
  addedAt: new Date('2026-06-21T10:00:00.000Z'),
}

describe('member-record mapping', () => {
  it('round-trips a record through the domain entity', () => {
    const member = toDomainMember(RECORD)
    expect(toMemberRecord(member)).toEqual(RECORD)
  })
})
