import { describe, expect, it } from 'vitest'
import { toIsoDate, todayIso } from '@/lib/api/dates'

describe('dates', () => {
  it('formats a local date as YYYY-MM-DD with padding', () => {
    expect(toIsoDate(new Date(2026, 5, 7))).toBe('2026-06-07')
    expect(toIsoDate(new Date(2026, 11, 21))).toBe('2026-12-21')
  })

  it('uses the provided date for today', () => {
    expect(todayIso(new Date(2026, 0, 1))).toBe('2026-01-01')
  })
})
