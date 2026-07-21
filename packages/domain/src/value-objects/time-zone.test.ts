import { describe, expect, it } from 'vitest'
import {
  civilDate,
  civilHour,
  isTimeZone,
  startOfCivilDay,
  zoneOffset,
  zonedInstant,
  zonedIso,
  zonedWallTimeToInstant,
  zonedWeekday,
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

  it('computes the local hour of day in the target zone', () => {
    const instant = new Date('2026-06-23T02:00:00.000Z')
    // 02:00 UTC is 23:00 the previous day in Sao Paulo (UTC-3)
    expect(civilHour(instant, 'America/Sao_Paulo')).toBe(23)
    expect(civilHour(instant, 'UTC')).toBe(2)
  })

  it('falls back to UTC when computing the hour for an invalid zone', () => {
    const instant = new Date('2026-06-23T02:00:00.000Z')
    expect(civilHour(instant, 'Nowhere/Land')).toBe(2)
  })

  it('returns the UTC-midnight marker for the local civil day', () => {
    const instant = new Date('2026-06-23T02:00:00.000Z')
    expect(startOfCivilDay(instant, 'America/Sao_Paulo').toISOString()).toBe(
      '2026-06-22T00:00:00.000Z',
    )
  })

  it('formats the zone UTC offset', () => {
    const instant = new Date('2026-07-18T14:30:00.000Z')
    expect(zoneOffset(instant, 'America/Sao_Paulo')).toBe('-03:00')
    expect(zoneOffset(instant, 'UTC')).toBe('+00:00')
    expect(zoneOffset(instant, 'Asia/Kolkata')).toBe('+05:30')
    expect(zoneOffset(instant, 'Nowhere/Land')).toBe('+00:00')
  })

  it('formats an instant as offset-aware local ISO 8601', () => {
    const instant = new Date('2026-07-18T14:30:00.000Z')
    // 14:30 UTC is 11:30 in Sao Paulo (UTC-3), preserving the wall clock.
    expect(zonedIso(instant, 'America/Sao_Paulo')).toBe(
      '2026-07-18T11:30:00-03:00',
    )
    expect(zonedIso(instant, 'UTC')).toBe('2026-07-18T14:30:00+00:00')
    // Round-trips back to the same instant.
    expect(new Date(zonedIso(instant, 'America/Sao_Paulo')).getTime()).toBe(
      instant.getTime(),
    )
  })

  it('builds the UTC instant for a local wall-clock hour', () => {
    // 09:00 in Sao Paulo (UTC-3) is 12:00 UTC.
    expect(
      zonedInstant('2026-07-18', 9, 'America/Sao_Paulo').toISOString(),
    ).toBe('2026-07-18T12:00:00.000Z')
    expect(zonedInstant('2026-07-18', 9, 'UTC').toISOString()).toBe(
      '2026-07-18T09:00:00.000Z',
    )
    // Half-hour offset zone.
    expect(zonedInstant('2026-07-18', 9, 'Asia/Kolkata').toISOString()).toBe(
      '2026-07-18T03:30:00.000Z',
    )
    // Hour 24 is midnight starting the next civil day.
    expect(zonedInstant('2026-07-18', 24, 'UTC').toISOString()).toBe(
      '2026-07-19T00:00:00.000Z',
    )
  })

  it('samples the offset per date, so DST is handled', () => {
    // New York is EST (-05:00) in January and EDT (-04:00) in July.
    expect(
      zonedInstant('2026-01-18', 9, 'America/New_York').toISOString(),
    ).toBe('2026-01-18T14:00:00.000Z')
    expect(
      zonedInstant('2026-07-18', 9, 'America/New_York').toISOString(),
    ).toBe('2026-07-18T13:00:00.000Z')
  })

  it('converges on a DST-transition day (the second pass corrects)', () => {
    // 2026-03-08 is US spring-forward: 02:00 EST jumps to 03:00 EDT. The
    // provisional instant is first sampled at the EST offset, so only the
    // second pass lands 09:00 EDT (-04:00) correctly at 13:00 UTC.
    expect(
      zonedInstant('2026-03-08', 9, 'America/New_York').toISOString(),
    ).toBe('2026-03-08T13:00:00.000Z')
    // 2026-11-01 is fall-back: 09:00 is EST (-05:00) → 14:00 UTC.
    expect(
      zonedInstant('2026-11-01', 9, 'America/New_York').toISOString(),
    ).toBe('2026-11-01T14:00:00.000Z')
  })

  it('resolves a full-precision wall time to an instant', () => {
    // 09:30:15 in Sao Paulo (UTC-3) is 12:30:15 UTC.
    expect(
      zonedWallTimeToInstant(
        '2026-07-18',
        9,
        30,
        15,
        'America/Sao_Paulo',
      ).toISOString(),
    ).toBe('2026-07-18T12:30:15.000Z')
    // Half-hour offset zone keeps minutes and seconds.
    expect(
      zonedWallTimeToInstant(
        '2026-07-18',
        14,
        15,
        0,
        'Asia/Kolkata',
      ).toISOString(),
    ).toBe('2026-07-18T08:45:00.000Z')
  })

  it('round-trips through civilHour and falls back to UTC for junk zones', () => {
    expect(
      civilHour(
        zonedInstant('2026-07-18', 14, 'America/Sao_Paulo'),
        'America/Sao_Paulo',
      ),
    ).toBe(14)
    expect(zonedInstant('2026-07-18', 9, 'Nowhere/Land').toISOString()).toBe(
      '2026-07-18T09:00:00.000Z',
    )
  })

  it('names the weekday in the target zone', () => {
    // 2026-07-19T01:00Z is still Saturday the 18th in Sao Paulo (UTC-3).
    const instant = new Date('2026-07-19T01:00:00.000Z')
    expect(zonedWeekday(instant, 'America/Sao_Paulo')).toBe('Saturday')
    expect(zonedWeekday(instant, 'UTC')).toBe('Sunday')
  })

  it('falls back to UTC for invalid zones when formatting', () => {
    const instant = new Date('2026-07-18T14:30:00.000Z')
    expect(zonedIso(instant, 'Nowhere/Land')).toBe('2026-07-18T14:30:00+00:00')
    expect(zonedWeekday(instant, 'Nowhere/Land')).toBe('Saturday')
  })
})
