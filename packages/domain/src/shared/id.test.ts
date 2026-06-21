import { describe, expect, it } from 'vitest'
import { asEntityId } from './id'
import { ValidationError } from './domain-error'

describe('asEntityId', () => {
  it('accepts a valid UUID', () => {
    const value = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'
    expect(asEntityId(value)).toBe(value)
  })

  it('throws on an invalid UUID', () => {
    expect(() => asEntityId('not-a-uuid')).toThrow(ValidationError)
  })
})
