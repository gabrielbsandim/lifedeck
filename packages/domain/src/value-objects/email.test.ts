import { describe, expect, it } from 'vitest'
import { Email, isDeliverableEmail } from '@/value-objects/email'
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

describe('isDeliverableEmail', () => {
  it('accepts a normal address', () => {
    expect(isDeliverableEmail('gabriel@lifedeck.com.br')).toBe(true)
  })

  it('rejects an address that is not even well formed', () => {
    expect(isDeliverableEmail('not-an-email')).toBe(false)
  })

  it.each([
    'seed@example.com',
    'seed@example.net',
    'seed@example.org',
    'seed@example.edu',
  ])('rejects the reserved documentation domain %s', address => {
    expect(isDeliverableEmail(address)).toBe(false)
  })

  it.each([
    'dev@app.test',
    'dev@host.invalid',
    'dev@api.localhost',
    'dev@mail.example',
  ])('rejects the reserved test suffix in %s', address => {
    expect(isDeliverableEmail(address)).toBe(false)
  })

  it('normalizes case and surrounding whitespace before deciding', () => {
    expect(isDeliverableEmail('  SEED@Example.COM ')).toBe(false)
  })

  it('does not reject a real domain that merely contains a reserved word', () => {
    expect(isDeliverableEmail('hi@example-agency.com.br')).toBe(true)
    expect(isDeliverableEmail('hi@testing.com')).toBe(true)
  })
})
