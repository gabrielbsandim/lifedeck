import { describe, expect, it } from 'vitest'
import { API_SCOPES, isApiScope } from '@/value-objects/api-scope'

describe('api-scope', () => {
  it('accepts every known scope', () => {
    for (const scope of API_SCOPES) {
      expect(isApiScope(scope)).toBe(true)
    }
  })

  it('rejects an unknown scope', () => {
    expect(isApiScope('tasks:delete')).toBe(false)
    expect(isApiScope('')).toBe(false)
  })
})
