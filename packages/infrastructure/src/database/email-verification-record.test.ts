import { describe, expect, it } from 'vitest'
import {
  toDomainEmailVerification,
  toEmailVerificationRecord,
  type EmailVerificationRecord,
} from '@/database/email-verification-record'

const RECORD: EmailVerificationRecord = {
  id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  userId: 'a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f',
  codeHash: 'code-hash',
  expiresAt: new Date('2026-06-22T10:15:00.000Z'),
  createdAt: new Date('2026-06-22T10:00:00.000Z'),
}

describe('email-verification-record mapping', () => {
  it('round-trips a record through the domain entity', () => {
    const verification = toDomainEmailVerification(RECORD)
    expect(toEmailVerificationRecord(verification)).toEqual(RECORD)
  })
})
