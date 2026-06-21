import { describe, expect, it } from 'vitest'
import { User } from '@/entities/user'
import { asEntityId } from '@/shared/id'
import { ValidationError } from '@/shared/domain-error'

const ID = asEntityId('3f2504e0-4f89-41d3-9a0c-0305e82c3301')
const CREATED_AT = new Date('2026-06-21T10:00:00.000Z')

function createGuest(displayName = 'Gabriel', locale = 'en') {
  return User.createGuest({
    id: ID,
    displayName,
    locale,
    createdAt: CREATED_AT,
  })
}

describe('User', () => {
  it('creates a guest with sensible defaults', () => {
    const user = createGuest('  Gabriel  ')

    expect(user.id).toBe(ID)
    expect(user.displayName).toBe('Gabriel')
    expect(user.isGuest).toBe(true)
    expect(user.locale).toBe('en')
    expect(user.toJSON()).toMatchObject({
      email: null,
      passwordHash: null,
      emailVerifiedAt: null,
      createdAt: CREATED_AT,
    })
  })

  it('rejects an empty display name', () => {
    expect(() => createGuest('   ')).toThrow(ValidationError)
  })

  it('rejects a display name longer than 80 characters', () => {
    expect(() => createGuest('a'.repeat(81))).toThrow(ValidationError)
  })

  it('rejects an empty locale', () => {
    expect(() => createGuest('Gabriel', ' ')).toThrow(ValidationError)
  })

  it('renames with validation', () => {
    const user = createGuest()
    user.rename('  Noiva  ')
    expect(user.displayName).toBe('Noiva')
    expect(() => user.rename('')).toThrow(ValidationError)
  })

  it('restores from persisted props', () => {
    const props = createGuest().toJSON()
    expect(User.restore(props).toJSON()).toEqual(props)
  })
})
