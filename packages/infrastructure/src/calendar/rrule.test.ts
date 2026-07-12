import { describe, expect, it } from 'vitest'
import type { RecurrenceRule } from '@lifedeck/domain'
import { fromGoogleRecurrence, toGoogleRecurrence } from '@/calendar/rrule'

const base: RecurrenceRule = {
  freq: 'weekly',
  interval: 1,
  startDate: '2026-01-01',
}

describe('toGoogleRecurrence', () => {
  it('serializes a simple daily rule', () => {
    expect(toGoogleRecurrence({ ...base, freq: 'daily', interval: 2 })).toEqual(
      ['RRULE:FREQ=DAILY;INTERVAL=2'],
    )
  })

  it('serializes weekdays as BYDAY tokens', () => {
    expect(toGoogleRecurrence({ ...base, byWeekday: [1, 3, 5] })).toEqual([
      'RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR',
    ])
  })

  it('drops out-of-range weekdays and omits BYDAY when none remain', () => {
    expect(toGoogleRecurrence({ ...base, byWeekday: [9, -1] })).toEqual([
      'RRULE:FREQ=WEEKLY;INTERVAL=1',
    ])
  })

  it('serializes a monthly rule with a month day', () => {
    expect(
      toGoogleRecurrence({ ...base, freq: 'monthly', byMonthday: 15 }),
    ).toEqual(['RRULE:FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=15'])
  })

  it('appends an inclusive end-of-day UNTIL', () => {
    expect(toGoogleRecurrence({ ...base, until: '2026-03-01' })).toEqual([
      'RRULE:FREQ=WEEKLY;INTERVAL=1;UNTIL=20260301T235959Z',
    ])
  })

  it('ignores a null until', () => {
    expect(toGoogleRecurrence({ ...base, until: null })).toEqual([
      'RRULE:FREQ=WEEKLY;INTERVAL=1',
    ])
  })
})

describe('fromGoogleRecurrence', () => {
  it('returns null when there are no recurrence lines', () => {
    expect(fromGoogleRecurrence(undefined, '2026-01-01')).toBeNull()
  })

  it('returns null when no RRULE line is present', () => {
    expect(
      fromGoogleRecurrence(['EXDATE:20260108T090000Z'], '2026-01-01'),
    ).toBeNull()
  })

  it('returns null for an unsupported frequency', () => {
    expect(
      fromGoogleRecurrence(['RRULE:FREQ=YEARLY;INTERVAL=1'], '2026-01-01'),
    ).toBeNull()
  })

  it('parses a daily rule and defaults a missing interval to 1', () => {
    expect(fromGoogleRecurrence(['RRULE:FREQ=DAILY'], '2026-01-01')).toEqual({
      freq: 'daily',
      interval: 1,
      startDate: '2026-01-01',
    })
  })

  it('parses BYDAY, ignoring ordinals and unknown tokens', () => {
    expect(
      fromGoogleRecurrence(
        ['RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=2MO,WE,XX,MO'],
        '2026-01-01',
      ),
    ).toEqual({
      freq: 'weekly',
      interval: 2,
      startDate: '2026-01-01',
      byWeekday: [1, 3],
    })
  })

  it('parses BYMONTHDAY and ignores an out-of-range value', () => {
    expect(
      fromGoogleRecurrence(['RRULE:FREQ=MONTHLY;BYMONTHDAY=15'], '2026-01-01'),
    ).toMatchObject({ byMonthday: 15 })
    expect(
      fromGoogleRecurrence(['RRULE:FREQ=MONTHLY;BYMONTHDAY=40'], '2026-01-01'),
    ).not.toHaveProperty('byMonthday')
  })

  it('parses an UNTIL timestamp', () => {
    expect(
      fromGoogleRecurrence(
        ['RRULE:FREQ=WEEKLY;UNTIL=20260301T235959Z'],
        '2026-01-01',
      ),
    ).toMatchObject({ until: '2026-03-01' })
  })

  it('drops an UNTIL that precedes the start date', () => {
    expect(
      fromGoogleRecurrence(['RRULE:FREQ=WEEKLY;UNTIL=20251201'], '2026-01-01'),
    ).not.toHaveProperty('until')
  })

  it('ignores a too-short UNTIL value', () => {
    expect(
      fromGoogleRecurrence(['RRULE:FREQ=WEEKLY;UNTIL=2026'], '2026-01-01'),
    ).not.toHaveProperty('until')
  })

  it('skips malformed segments without a key', () => {
    expect(
      fromGoogleRecurrence(['RRULE:;FREQ=DAILY;=WE;INTERVAL=0'], '2026-01-01'),
    ).toEqual({ freq: 'daily', interval: 1, startDate: '2026-01-01' })
  })

  it('round-trips a rule through Google form', () => {
    const rule: RecurrenceRule = {
      freq: 'weekly',
      interval: 3,
      byWeekday: [1, 4],
      startDate: '2026-01-01',
      until: '2026-06-01',
    }
    const restored = fromGoogleRecurrence(
      toGoogleRecurrence(rule),
      rule.startDate,
    )
    expect(restored).toEqual(rule)
  })
})
