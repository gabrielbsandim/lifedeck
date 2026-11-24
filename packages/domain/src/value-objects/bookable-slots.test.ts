import { describe, expect, it } from 'vitest'
import {
  bookableSlots,
  type BookableSlotsParams,
} from '@/value-objects/bookable-slots'

// 2026-06-22 is a Monday.
const MONDAY = '2026-06-22'
const at = (iso: string) => new Date(iso)

function params(overrides: Partial<BookableSlotsParams> = {}) {
  return {
    timezone: 'UTC',
    weekly: [{ weekday: 1, startMinute: 9 * 60, endMinute: 12 * 60 }],
    overrides: [],
    from: at(`${MONDAY}T00:00:00.000Z`),
    to: at('2026-06-23T00:00:00.000Z'),
    now: at('2026-06-21T12:00:00.000Z'),
    durationMin: 60,
    slotStepMin: 30,
    bufferBeforeMin: 0,
    bufferAfterMin: 0,
    minNoticeMin: 0,
    maxHorizonDays: 30,
    maxPerDay: null,
    busy: [],
    bookedStarts: [],
    ...overrides,
  }
}

const starts = (overrides: Partial<BookableSlotsParams> = {}) =>
  bookableSlots(params(overrides)).map(slot => slot.start.toISOString())

const hours = (overrides: Partial<BookableSlotsParams> = {}) =>
  starts(overrides).map(iso => iso.slice(11, 16))

describe('bookableSlots', () => {
  it('steps through the weekly window', () => {
    expect(hours()).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00'])
    const [first] = bookableSlots(params())
    expect(first!.end.toISOString()).toBe(`${MONDAY}T10:00:00.000Z`)
  })

  it('keeps each buffer clear on its own side of busy time', () => {
    const busy = [
      {
        start: at(`${MONDAY}T10:00:00.000Z`),
        end: at(`${MONDAY}T10:30:00.000Z`),
      },
    ]
    const common = { busy, durationMin: 30 }
    expect(hours({ ...common, bufferAfterMin: 30 })).toEqual([
      '09:00',
      '10:30',
      '11:00',
      '11:30',
    ])
    expect(hours({ ...common, bufferBeforeMin: 30 })).toEqual([
      '09:00',
      '09:30',
      '11:00',
      '11:30',
    ])
  })

  it('offers nothing before the minimum notice', () => {
    expect(
      hours({ now: at(`${MONDAY}T08:30:00.000Z`), minNoticeMin: 120 }),
    ).toEqual(['10:30', '11:00'])
  })

  it('offers nothing past the booking horizon', () => {
    const everyWeekday = [1, 2, 3, 4, 5].map(weekday => ({
      weekday,
      startMinute: 9 * 60,
      endMinute: 10 * 60,
    }))
    expect(
      starts({
        weekly: everyWeekday,
        to: at('2026-06-29T00:00:00.000Z'),
        now: at(`${MONDAY}T08:00:00.000Z`),
        maxHorizonDays: 1,
      }),
    ).toEqual([`${MONDAY}T09:00:00.000Z`])
  })

  it('skips a day that already holds the daily maximum', () => {
    const weekly = [1, 2].map(weekday => ({
      weekday,
      startMinute: 9 * 60,
      endMinute: 10 * 60,
    }))
    const range = { weekly, to: at('2026-06-24T00:00:00.000Z') }
    expect(
      starts({
        ...range,
        maxPerDay: 1,
        bookedStarts: [at(`${MONDAY}T15:00:00.000Z`)],
      }),
    ).toEqual(['2026-06-23T09:00:00.000Z'])
    expect(
      starts({
        ...range,
        maxPerDay: 2,
        bookedStarts: [at(`${MONDAY}T15:00:00.000Z`)],
      }),
    ).toHaveLength(2)
  })

  it('lets a date override close a day or replace its hours', () => {
    expect(hours({ overrides: [{ date: MONDAY, windows: [] }] })).toEqual([])
    expect(
      hours({
        overrides: [
          { date: MONDAY, windows: [{ startMinute: 840, endMinute: 900 }] },
        ],
      }),
    ).toEqual(['14:00'])
  })

  it('runs a slot across midnight when the windows touch', () => {
    const weekly = [
      { weekday: 1, startMinute: 22 * 60, endMinute: 24 * 60 },
      { weekday: 2, startMinute: 0, endMinute: 2 * 60 },
    ]
    expect(
      starts({ weekly, to: at('2026-06-24T00:00:00.000Z') }).slice(2, 4),
    ).toEqual(['2026-06-22T23:00:00.000Z', '2026-06-22T23:30:00.000Z'])
  })

  it('keeps local hours across the spring and autumn DST changes', () => {
    const weekends = [0, 6].map(weekday => ({
      weekday,
      startMinute: 9 * 60,
      endMinute: 10 * 60,
    }))
    const zone = { timezone: 'America/New_York', weekly: weekends }
    // 2026-03-08 is the Sunday clocks go forward.
    expect(
      starts({
        ...zone,
        from: at('2026-03-07T00:00:00.000Z'),
        to: at('2026-03-09T12:00:00.000Z'),
        now: at('2026-03-01T00:00:00.000Z'),
      }),
    ).toEqual(['2026-03-07T14:00:00.000Z', '2026-03-08T13:00:00.000Z'])
    // 2026-11-01 is the Sunday clocks go back.
    expect(
      starts({
        ...zone,
        from: at('2026-10-31T00:00:00.000Z'),
        to: at('2026-11-02T12:00:00.000Z'),
        now: at('2026-10-25T00:00:00.000Z'),
      }),
    ).toEqual(['2026-10-31T13:00:00.000Z', '2026-11-01T14:00:00.000Z'])
  })

  it('reads weekdays in the page zone, not in UTC', () => {
    // Monday 22:00 in Sao Paulo is already Tuesday 01:00 UTC.
    expect(
      starts({
        timezone: 'America/Sao_Paulo',
        weekly: [{ weekday: 1, startMinute: 22 * 60, endMinute: 23 * 60 }],
        to: at('2026-06-24T00:00:00.000Z'),
      }),
    ).toEqual(['2026-06-23T01:00:00.000Z'])
  })

  it('offers only slots that start inside the requested range', () => {
    expect(hours({ to: at(`${MONDAY}T10:00:00.000Z`) })).toEqual([
      '09:00',
      '09:30',
    ])
  })

  it('returns nothing when notice or horizon leave no room', () => {
    expect(hours({ from: at('2026-06-23T00:00:00.000Z') })).toEqual([])
    expect(
      hours({ now: at(`${MONDAY}T00:00:00.000Z`), maxHorizonDays: 0 }),
    ).toEqual([])
  })
})
