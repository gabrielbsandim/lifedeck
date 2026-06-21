import { describe, expect, it } from 'vitest'
import { Email } from '@/value-objects/email'
import { ValidationError } from '@/shared/domain-error'

describe('Email', () => {
  it('normalizes and accepts a valid address', () => {
    const email = Email.create('  User@Example.COM ')
    expect(email.value).toBe('user@example.com')
    expect(email.toString()).toBe('user@example.com')
  })

  it('rejects an invalid address', () => {
    expect(() => Email.create('nope')).toThrow(ValidationError)
  })

  it('compares two addresses by value', () => {
    expect(Email.create('a@b.com').equals(Email.create('A@B.com'))).toBe(true)
    expect(Email.create('a@b.com').equals(Email.create('c@d.com'))).toBe(false)
  })
})
