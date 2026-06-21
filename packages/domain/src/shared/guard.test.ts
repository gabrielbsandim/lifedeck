import { describe, expect, it } from 'vitest'
import { guard } from '@/shared/guard'
import { ValidationError } from '@/shared/domain-error'

describe('guard.notEmpty', () => {
  it('returns the trimmed value when not empty', () => {
    expect(guard.notEmpty('  hello  ', 'Field')).toBe('hello')
  })

  it('throws when the value is blank', () => {
    expect(() => guard.notEmpty('   ', 'Field')).toThrow(ValidationError)
  })
})

describe('guard.maxLength', () => {
  it('returns the value when within the limit', () => {
    expect(guard.maxLength('abc', 3, 'Field')).toBe('abc')
  })

  it('throws when the value exceeds the limit', () => {
    expect(() => guard.maxLength('abcd', 3, 'Field')).toThrow(ValidationError)
  })
})

describe('guard.oneOf', () => {
  it('returns the value when allowed', () => {
    expect(guard.oneOf('a', ['a', 'b'] as const, 'Field')).toBe('a')
  })

  it('throws when the value is not allowed', () => {
    expect(() => guard.oneOf('c', ['a', 'b'] as const, 'Field')).toThrow(
      ValidationError,
    )
  })
})
