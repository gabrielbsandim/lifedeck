// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as RateLimit from '@/server/api/rate-limit'

const checkBookingSlotsRateLimit = vi.fn()
const checkBookingRequestRateLimit = vi.fn()

vi.mock('@/server/api/rate-limit', async importOriginal => ({
  ...(await importOriginal<typeof RateLimit>()),
  checkBookingSlotsRateLimit,
  checkBookingRequestRateLimit,
}))

vi.mock('botid/server', () => ({
  checkBotId: async () => ({ isBot: false }),
}))

const {
  enforceBookingRequestLimit,
  enforceBookingSlotsLimit,
  isHoneypotFilled,
  rejectBot,
} = await import('@/server/api/booking-guard')

const OPEN = { ok: true, limit: 5, remaining: 4, reset: 0 }
const SHUT = { ok: false, limit: 5, remaining: 0, reset: 1000 }

function request(): Request {
  return new Request('https://app.test/api/v1/public/booking/ana', {
    headers: { 'x-real-ip': '9.9.9.9' },
  })
}

describe('booking rate limits', () => {
  beforeEach(() => {
    checkBookingSlotsRateLimit.mockReset()
    checkBookingRequestRateLimit.mockReset()
  })

  it('keys slot lookups by IP', async () => {
    checkBookingSlotsRateLimit.mockResolvedValue(OPEN)
    expect(await enforceBookingSlotsLimit(request())).toBeNull()
    expect(checkBookingSlotsRateLimit).toHaveBeenCalledWith('9.9.9.9')
    checkBookingSlotsRateLimit.mockResolvedValue(SHUT)
    expect((await enforceBookingSlotsLimit(request()))?.status).toBe(429)
  })

  it('limits requests by IP and by normalized email', async () => {
    checkBookingRequestRateLimit.mockResolvedValue(OPEN)
    expect(
      await enforceBookingRequestLimit(request(), ' Joao@Mail.com '),
    ).toBeNull()
    expect(checkBookingRequestRateLimit).toHaveBeenCalledWith('ip:9.9.9.9')
    expect(checkBookingRequestRateLimit).toHaveBeenCalledWith(
      'email:joao@mail.com',
    )
  })

  it('answers 429 when either bucket is empty', async () => {
    checkBookingRequestRateLimit.mockResolvedValueOnce(SHUT)
    checkBookingRequestRateLimit.mockResolvedValueOnce(OPEN)
    const byIp = await enforceBookingRequestLimit(request(), 'a@b.co')
    expect(byIp?.status).toBe(429)
    expect(byIp?.headers.get('x-ratelimit-reset')).toBe('1000')
    checkBookingRequestRateLimit.mockResolvedValueOnce(OPEN)
    checkBookingRequestRateLimit.mockResolvedValueOnce(SHUT)
    expect(
      (await enforceBookingRequestLimit(request(), 'a@b.co'))?.status,
    ).toBe(429)
  })
})

describe('rejectBot', () => {
  it('skips the check unless BotID is switched on', async () => {
    const check = vi.fn()
    expect(await rejectBot(check, {})).toBeNull()
    expect(check).not.toHaveBeenCalled()
  })

  it('blocks a bot when on and lets a person through', async () => {
    const on = { NEXT_PUBLIC_BOTID_ENABLED: 'true' }
    const bot = await rejectBot(async () => ({ isBot: true }), on)
    expect(bot?.status).toBe(403)
    expect(await rejectBot(async () => ({ isBot: false }), on)).toBeNull()
  })

  it('defaults to BotID and the process env', async () => {
    expect(await rejectBot()).toBeNull()
  })
})

describe('isHoneypotFilled', () => {
  it('flags only a non-empty hidden field', () => {
    expect(isHoneypotFilled({ website: 'http://spam' })).toBe(true)
    expect(isHoneypotFilled({ website: '  ' })).toBe(false)
    expect(isHoneypotFilled({ website: 3 })).toBe(false)
    expect(isHoneypotFilled({})).toBe(false)
    expect(isHoneypotFilled(null)).toBe(false)
    expect(isHoneypotFilled('x')).toBe(false)
  })
})
