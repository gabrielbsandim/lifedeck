import { describe, expect, it } from 'vitest'
import {
  occursOn,
  validateRecurrenceRule,
  type RecurrenceRule,
} from '@/value-objects/recurrence-rule'
import { ValidationError } from '@/shared/domain-error'

function rule(overrides: Partial<RecurrenceRule>): RecurrenceRule {
  return {
    freq: 'daily',
    interval: 1,
    startDate: '2026-06-21',
    ...overrides,
  }
}

const at = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

describe('validateRecurrenceRule', () => {
  it('accepts a valid rule', () => {
    const valid = rule({
      freq: 'weekly',
      byWeekday: [1, 3],
      until: '2026-12-31',
    })
    expect(validateRecurrenceRule(valid)).toBe(valid)
  })

  it('rejects an unknown frequency', () => {
    expect(() =>
      validateRecurrenceRule(rule({ freq: 'yearly' as never })),
    ).toThrow(ValidationError)
  })

  it('rejects a non-positive or fractional interval', () => {
    expect(() => validateRecurrenceRule(rule({ interval: 0 }))).toThrow(
      ValidationError,
    )
    expect(() => validateRecurrenceRule(rule({ interval: 1.5 }))).toThrow(
      ValidationError,
    )
  })

  it('rejects weekdays out of range', () => {
    expect(() =>
      validateRecurrenceRule(rule({ freq: 'weekly', byWeekday: [7] })),
    ).toThrow(ValidationError)
  })

  it('rejects a month day out of range', () => {
    expect(() =>
      validateRecurrenceRule(rule({ freq: 'monthly', byMonthday: 32 })),
    ).toThrow(ValidationError)
  })

  it('rejects malformed and impossible dates', () => {
    expect(() =>
      validateRecurrenceRule(rule({ startDate: '21-06-2026' })),
    ).toThrow(ValidationError)
    expect(() =>
      validateRecurrenceRule(rule({ startDate: '2026-13-40' })),
    ).toThrow(ValidationError)
  })

  it('rejects an until date before the start date', () => {
    expect(() => validateRecurrenceRule(rule({ until: '2026-06-20' }))).toThrow(
      ValidationError,
    )
  })
})

describe('occursOn', () => {
  it('never fires before the start date', () => {
    expect(occursOn(rule({}), at('2026-06-20'))).toBe(false)
  })

  it('respects the until boundary', () => {
    const r = rule({ until: '2026-06-22' })
    expect(occursOn(r, at('2026-06-22'))).toBe(true)
    expect(occursOn(r, at('2026-06-23'))).toBe(false)
  })

  it('handles daily intervals', () => {
    const r = rule({ interval: 2 })
    expect(occursOn(r, at('2026-06-21'))).toBe(true)
    expect(occursOn(r, at('2026-06-22'))).toBe(false)
    expect(occursOn(r, at('2026-06-23'))).toBe(true)
  })

  it('handles weekly by weekday', () => {
    const r = rule({ freq: 'weekly', byWeekday: [1, 3] })
    expect(occursOn(r, at('2026-06-22'))).toBe(true) // Monday
    expect(occursOn(r, at('2026-06-24'))).toBe(true) // Wednesday
    expect(occursOn(r, at('2026-06-23'))).toBe(false) // Tuesday
  })

  it('defaults weekly to the start weekday with an interval', () => {
    // 2026-06-21 is a Sunday
    const r = rule({ freq: 'weekly', interval: 2 })
    expect(occursOn(r, at('2026-06-21'))).toBe(true)
    expect(occursOn(r, at('2026-06-28'))).toBe(false) // one week later
    expect(occursOn(r, at('2026-07-05'))).toBe(true) // two weeks later
  })

  it('handles monthly by month day with an interval', () => {
    const r = rule({ freq: 'monthly', byMonthday: 21, interval: 2 })
    expect(occursOn(r, at('2026-06-21'))).toBe(true)
    expect(occursOn(r, at('2026-07-21'))).toBe(false) // one month later
    expect(occursOn(r, at('2026-08-21'))).toBe(true) // two months later
  })

  it('defaults monthly to the start day of month', () => {
    const r = rule({ freq: 'monthly', startDate: '2026-06-21' })
    expect(occursOn(r, at('2026-07-21'))).toBe(true)
    expect(occursOn(r, at('2026-07-20'))).toBe(false)
  })

  it('skips months without the requested day', () => {
    const r = rule({ freq: 'monthly', byMonthday: 31, startDate: '2026-01-31' })
    expect(occursOn(r, at('2026-02-28'))).toBe(false)
    expect(occursOn(r, at('2026-03-31'))).toBe(true)
  })
})
