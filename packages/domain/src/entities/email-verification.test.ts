import { describe, expect, it } from 'vitest'
import { EmailVerification } from '@/entities/email-verification'
import { asEntityId } from '@/shared/id'
import { ValidationError } from '@/shared/domain-error'

const ID = asEntityId('7c9e6679-7425-40de-944b-e07fc1f90ae7')
const USER_ID = asEntityId('3f2504e0-4f89-41d3-9a0c-0305e82c3301')
const CREATED_AT = new Date('2026-06-22T10:00:00.000Z')
const EXPIRES_AT = new Date('2026-06-22T10:15:00.000Z')

function create(codeHash = 'code-hash') {
  return EmailVerification.create({
    id: ID,
    userId: USER_ID,
    codeHash,
    expiresAt: EXPIRES_AT,
    createdAt: CREATED_AT,
  })
}

describe('EmailVerification', () => {
  it('creates a verification with its fields', () => {
    const verification = create()
    expect(verification.id).toBe(ID)
    expect(verification.userId).toBe(USER_ID)
    expect(verification.codeHash).toBe('code-hash')
  })

  it('rejects an empty code hash', () => {
    expect(() => create('  ')).toThrow(ValidationError)
  })

  it('is expired only after the expiry instant', () => {
    const verification = create()
    expect(verification.isExpired(new Date('2026-06-22T10:10:00.000Z'))).toBe(
      false,
    )
    expect(verification.isExpired(new Date('2026-06-22T10:20:00.000Z'))).toBe(
      true,
    )
  })

  it('restores from persisted props', () => {
    const props = create().toJSON()
    expect(EmailVerification.restore(props).toJSON()).toEqual(props)
  })
})
