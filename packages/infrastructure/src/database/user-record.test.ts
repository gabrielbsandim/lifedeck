import { describe, expect, it } from 'vitest'
import {
  toDomainUser,
  toUserRecord,
  type UserRecord,
} from '@/database/user-record'

const RECORD: UserRecord = {
  id: 'a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f',
  displayName: 'Gabriel',
  email: 'gabriel@example.com',
  passwordHash: 'hashed',
  emailVerified: new Date('2026-06-21T12:00:00.000Z'),
  isGuest: false,
  locale: 'en',
  createdAt: new Date('2026-06-21T10:00:00.000Z'),
}

describe('user-record mapping', () => {
  it('round-trips a record through the domain entity', () => {
    const user = toDomainUser(RECORD)
    expect(toUserRecord(user)).toEqual(RECORD)
  })

  it('maps a guest with empty optional fields', () => {
    const user = toDomainUser({
      ...RECORD,
      email: null,
      passwordHash: null,
      emailVerified: null,
      isGuest: true,
    })
    const record = toUserRecord(user)
    expect(record.email).toBeNull()
    expect(record.passwordHash).toBeNull()
    expect(record.emailVerified).toBeNull()
    expect(record.isGuest).toBe(true)
  })
})
