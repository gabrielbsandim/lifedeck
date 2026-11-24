// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as RateLimit from '@/server/api/rate-limit'

const checkPublicRateLimit = vi.fn()

vi.mock('@/server/api/rate-limit', async importOriginal => ({
  ...(await importOriginal<typeof RateLimit>()),
  checkPublicRateLimit,
}))

const { enforcePublicRateLimit } = await import('@/server/api/public-guard')

function request(): Request {
  return new Request('https://app.test/api/v1/vitals', {
    headers: { 'x-real-ip': '9.9.9.9' },
  })
}

describe('enforcePublicRateLimit', () => {
  beforeEach(() => checkPublicRateLimit.mockReset())

  it('lets the request through under the limit, keyed by scope and IP', async () => {
    checkPublicRateLimit.mockResolvedValue({
      ok: true,
      limit: 60,
      remaining: 59,
      reset: 0,
    })
    expect(await enforcePublicRateLimit(request(), 'vitals')).toBeNull()
    expect(checkPublicRateLimit).toHaveBeenCalledWith('vitals:9.9.9.9')
  })

  it('answers 429 with the limit headers over it', async () => {
    checkPublicRateLimit.mockResolvedValue({
      ok: false,
      limit: 60,
      remaining: 0,
      reset: 1000,
    })
    const response = await enforcePublicRateLimit(request(), 'shared')
    expect(response?.status).toBe(429)
    expect(response?.headers.get('x-ratelimit-remaining')).toBe('0')
  })
})
