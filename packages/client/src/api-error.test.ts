import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api-error'

describe('ApiError', () => {
  it('carries the status, code, and message', () => {
    const error = new ApiError(404, 'NOT_FOUND', 'Missing')
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('ApiError')
    expect(error.status).toBe(404)
    expect(error.code).toBe('NOT_FOUND')
    expect(error.message).toBe('Missing')
  })
})
