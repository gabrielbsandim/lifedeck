import { describe, expect, it } from 'vitest'
import {
  civilDate,
  isTimeZone,
  startOfCivilDay,
} from '@/value-objects/time-zone'

describe('time zone', () => {
  it('recognizes valid IANA zones and rejects junk', () => {
    expect(isTimeZone('America/Sao_Paulo')).toBe(true)
    expect(isTimeZone('UTC')).toBe(true)
    expect(isTimeZone('')).toBe(false)
    expect(isTimeZone('Mars/Phobos')).toBe(false)
  })

  it('computes the civil date in the target zone', () => {
    const instant = new Date('2026-06-23T02:00:00.000Z')
    // 02:00 UTC is still 2026-06-22 23:00 in Sao Paulo (UTC-3)
    expect(civilDate(instant, 'America/Sao_Paulo')).toBe('2026-06-22')
    expect(civilDate(instant, 'UTC')).toBe('2026-06-23')
  })

  it('falls back to UTC for an invalid zone', () => {
    const instant = new Date('2026-06-23T02:00:00.000Z')
    expect(civilDate(instant, 'Nowhere/Land')).toBe('2026-06-23')
  })

  it('returns the UTC-midnight marker for the local civil day', () => {
    const instant = new Date('2026-06-23T02:00:00.000Z')
    expect(startOfCivilDay(instant, 'America/Sao_Paulo').toISOString()).toBe(
      '2026-06-22T00:00:00.000Z',
    )
  })
})
