// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const limit = vi.fn()

vi.mock('@upstash/redis', () => ({
  Redis: class {
    constructor() {}
  },
}))

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow() {
      return {}
    }
    limit = limit
  },
}))

import {
  checkAuthRateLimit,
  checkGenerateRateLimit,
  checkGuestSessionRateLimit,
  checkRateLimit,
  checkSessionRateLimit,
  checkWhatsappRateLimit,
  clientIp,
  rateLimitHeaders,
} from '@/server/api/rate-limit'

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

  it('allows auth attempts when Upstash is not configured', async () => {
    const result = await checkAuthRateLimit('sign-in:gab@example.com:1.2.3.4')
    expect(result.ok).toBe(true)
    expect(result.limit).toBe(8)
  })

  it('allows session traffic when Upstash is not configured', async () => {
    const result = await checkSessionRateLimit('user:abc')
    expect(result.ok).toBe(true)
    expect(result.limit).toBe(240)
  })

  it('allows list generation when Upstash is not configured', async () => {
    const result = await checkGenerateRateLimit('generate:abc')
    expect(result.ok).toBe(true)
    expect(result.limit).toBe(6)
  })

  it('allows whatsapp messages when Upstash is not configured', async () => {
    const result = await checkWhatsappRateLimit('whatsapp:5511999990000')
    expect(result.ok).toBe(true)
    expect(result.limit).toBe(10)
  })

  it('allows guest sessions when Upstash is not configured', async () => {
    const result = await checkGuestSessionRateLimit('guest:1.2.3.4')
    expect(result.ok).toBe(true)
    expect(result.limit).toBe(5)
  })

  it('reads the client IP from x-forwarded-for then x-real-ip', () => {
    expect(
      clientIp(
        new Request('https://lifedeck.app', {
          headers: { 'x-forwarded-for': '9.9.9.9, 10.0.0.1' },
        }),
      ),
    ).toBe('9.9.9.9')
    expect(
      clientIp(
        new Request('https://lifedeck.app', {
          headers: { 'x-real-ip': '8.8.8.8' },
        }),
      ),
    ).toBe('8.8.8.8')
    expect(clientIp(new Request('https://lifedeck.app'))).toBe('unknown')
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

  it('delegates to Upstash when configured', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://upstash.test'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    limit.mockResolvedValue({
      success: false,
      limit: 60,
      remaining: 0,
      reset: 2000,
    })
    vi.resetModules()
    const mod = await import('@/server/api/rate-limit')
    const result = await mod.checkRateLimit('apikey:abc')
    expect(limit).toHaveBeenCalledWith('apikey:abc')
    expect(result).toEqual({ ok: false, limit: 60, remaining: 0, reset: 2000 })
  })
})
