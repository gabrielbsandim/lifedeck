import { describe, expect, it, vi } from 'vitest'

const getCalendars = vi.fn(() => [{ timeZone: 'America/Sao_Paulo' }])
vi.mock('expo-localization', () => ({ getCalendars: () => getCalendars() }))

const { addDays, deviceTimeZone, toIsoDate, todayIso } = await import(
  '@/lib/api/dates'
)

describe('dates', () => {
  it('formats a Date as a local ISO day', () => {
    expect(toIsoDate(new Date(2026, 6, 5))).toBe('2026-07-05')
  })

  it('defaults todayIso to now', () => {
    expect(todayIso(new Date(2026, 0, 31))).toBe('2026-01-31')
  })

  it('steps days across a month boundary', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('reads the time zone from the OS', () => {
    expect(deviceTimeZone()).toBe('America/Sao_Paulo')
  })

  it('falls back to Intl when the OS reports none', () => {
    getCalendars.mockReturnValueOnce([])
    // Intl resolves to whatever the test runner's zone is; only the shape of
    // the fallback matters here.
    expect(typeof deviceTimeZone()).toBe('string')
    expect(deviceTimeZone()).not.toBe('')
  })

  it('falls back to UTC when Intl throws', () => {
    getCalendars.mockReturnValueOnce([])
    const original = Intl.DateTimeFormat
    // @ts-expect-error - deliberately breaking Intl to exercise the catch.
    Intl.DateTimeFormat = () => {
      throw new Error('unavailable')
    }
    try {
      expect(deviceTimeZone()).toBe('UTC')
    } finally {
      Intl.DateTimeFormat = original
    }
  })
})
