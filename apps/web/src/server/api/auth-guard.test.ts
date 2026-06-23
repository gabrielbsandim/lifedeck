// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

const { checkAuthRateLimit } = vi.hoisted(() => ({
  checkAuthRateLimit: vi.fn(),
}))

vi.mock('@/server/api/rate-limit', () => ({
  checkAuthRateLimit,
  clientIp: () => '1.2.3.4',
  rateLimitHeaders: () => ({ 'x-ratelimit-remaining': '0' }),
}))

import { enforceAuthRateLimit } from '@/server/api/auth-guard'

const request = new Request('https://lifedeck.app/api/v1/auth/sign-in')

describe('enforceAuthRateLimit', () => {
  afterEach(() => {
    checkAuthRateLimit.mockReset()
  })

  it('returns null (allows) when within the limit', async () => {
    checkAuthRateLimit.mockResolvedValue({
      ok: true,
      limit: 8,
      remaining: 7,
      reset: 0,
    })
    expect(
      await enforceAuthRateLimit(request, 'sign-in', 'gab@example.com'),
    ).toBeNull()
  })

  it('responds 429 when the limit is exceeded', async () => {
    checkAuthRateLimit.mockResolvedValue({
      ok: false,
      limit: 8,
      remaining: 0,
      reset: 1000,
    })
    const result = await enforceAuthRateLimit(request, 'sign-in', 'gab@x.com')
    expect(result).not.toBeNull()
    expect((result as Response).status).toBe(429)
    expect((result as Response).headers.get('x-ratelimit-remaining')).toBe('0')
  })
})
