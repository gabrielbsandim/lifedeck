import { describe, expect, it } from 'vitest'
import { DomainError, ValidationError } from './domain-error'

describe('ValidationError', () => {
  it('is a DomainError with a stable code and name', () => {
    const error = new ValidationError('boom')
    expect(error).toBeInstanceOf(DomainError)
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.name).toBe('ValidationError')
    expect(error.message).toBe('boom')
  })
})
