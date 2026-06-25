import { describe, expect, it } from 'vitest'
import { corsHeaders, isPublicApiPath } from '@/server/api/cors'

describe('cors', () => {
  it('allows any origin without exposing credentials', () => {
    const headers = corsHeaders()
    expect(headers['Access-Control-Allow-Origin']).toBe('*')
    expect(headers['Access-Control-Allow-Credentials']).toBeUndefined()
    expect(headers['Access-Control-Allow-Headers']).toContain('X-API-Key')
    expect(headers['Access-Control-Allow-Methods']).toContain('DELETE')
  })

  it('matches only versioned public API paths', () => {
    expect(isPublicApiPath('/api/v1/tasks')).toBe(true)
    expect(isPublicApiPath('/api/v1/calendar/events')).toBe(true)
    expect(isPublicApiPath('/docs')).toBe(false)
    expect(isPublicApiPath('/api/health')).toBe(false)
  })
})
