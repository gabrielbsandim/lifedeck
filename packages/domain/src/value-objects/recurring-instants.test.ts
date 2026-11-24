import { describe, expect, it } from 'vitest'
import { recurringInstantsBetween } from '@/value-objects/recurring-instants'

const HOUR_MS = 3_600_000

describe('recurringInstantsBetween', () => {
  it('keeps a 22:00 Sao Paulo weekly event on its local weekday', () => {
    // Tuesday 2026-11-03 22:00 -03:00 is Wednesday 01:00 UTC.
    const instants = recurringInstantsBetween({
      rule: { freq: 'weekly', interval: 1, startDate: '2026-11-04' },
      firstStartsAt: new Date('2026-11-04T01:00:00.000Z'),
      durationMs: HOUR_MS,
      from: new Date('2026-11-09T00:00:00.000Z'),
      to: new Date('2026-11-16T00:00:00.000Z'),
      timeZone: 'America/Sao_Paulo',
    })

    expect(instants.map(instant => instant.startsAt.toISOString())).toEqual([
      '2026-11-11T01:00:00.000Z',
    ])
  })

  it('holds the wall clock across a DST change', () => {
    // 09:00 New York every Monday; DST starts on 2026-03-08.
    const instants = recurringInstantsBetween({
      rule: {
        freq: 'weekly',
        interval: 1,
        startDate: '2026-03-02',
        byWeekday: [1],
      },
      firstStartsAt: new Date('2026-03-02T14:00:00.000Z'),
      durationMs: HOUR_MS,
      from: new Date('2026-03-01T00:00:00.000Z'),
      to: new Date('2026-03-15T00:00:00.000Z'),
      timeZone: 'America/New_York',
    })

    expect(instants.map(instant => instant.startsAt.toISOString())).toEqual([
      '2026-03-02T14:00:00.000Z',
      '2026-03-09T13:00:00.000Z',
    ])
  })

  it('returns an occurrence that started before the range and runs into it', () => {
    const instants = recurringInstantsBetween({
      rule: { freq: 'daily', interval: 1, startDate: '2026-06-01' },
      firstStartsAt: new Date('2026-06-01T23:00:00.000Z'),
      durationMs: 2 * HOUR_MS,
      from: new Date('2026-06-03T00:30:00.000Z'),
      to: new Date('2026-06-03T00:45:00.000Z'),
      timeZone: 'UTC',
    })

    expect(instants).toEqual([
      {
        startsAt: new Date('2026-06-02T23:00:00.000Z'),
        endsAt: new Date('2026-06-03T01:00:00.000Z'),
      },
    ])
  })
})
