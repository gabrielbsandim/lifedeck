// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { checkRateLimit, rateLimitHeaders } from '@/server/api/rate-limit'

describe('rate limit', () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('allows every request when Upstash is not configured', async () => {
    const result = await checkRateLimit('apikey:test')
    expect(result.ok).toBe(true)
    expect(result.remaining).toBeGreaterThan(0)
  })

  it('exposes standard rate-limit headers', () => {
    const headers = rateLimitHeaders({
      ok: true,
      limit: 60,
      remaining: 59,
      reset: 1000,
    })
    expect(headers).toMatchObject({
      'x-ratelimit-limit': '60',
      'x-ratelimit-remaining': '59',
      'x-ratelimit-reset': '1000',
    })
  })

  it('never reports a negative remaining count', () => {
    const headers = rateLimitHeaders({
      ok: false,
      limit: 60,
      remaining: -3,
      reset: 1000,
    }) as Record<string, string>
    expect(headers['x-ratelimit-remaining']).toBe('0')
  })
})
