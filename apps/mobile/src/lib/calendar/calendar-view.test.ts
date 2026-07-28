import { describe, expect, it } from 'vitest'
import type { CalendarEventView } from '@lifedeck/application'
import {
  eventDay,
  groupByDay,
  monthGrid,
  rangeFor,
  stepAnchor,
  weekDays,
} from '@/lib/calendar/calendar-view'

function event(id: string, startsAt: string): CalendarEventView {
  return {
    id,
    ownerId: 'b1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f',
    title: id,
    description: null,
    location: null,
    startsAt,
    endsAt: startsAt,
    allDay: false,
    reminders: [],
    recurrence: null,
    recurring: false,
    seriesId: null,
    occurrenceStart: null,
    source: 'local',
    externalId: null,
    createdAt: startsAt,
    updatedAt: startsAt,
  }
}

describe('rangeFor', () => {
  it('covers a single day for the day view', () => {
    expect(rangeFor('day', '2026-06-24')).toEqual({
      from: '2026-06-24T00:00:00.000Z',
      to: '2026-06-25T00:00:00.000Z',
    })
  })

  it('covers a Sunday-first week for the week view', () => {
    // 2026-06-24 is a Wednesday; the week starts Sunday 2026-06-21.
    expect(rangeFor('week', '2026-06-24')).toEqual({
      from: '2026-06-21T00:00:00.000Z',
      to: '2026-06-28T00:00:00.000Z',
    })
  })

  it('covers a full 6-week grid for the month view', () => {
    const range = rangeFor('month', '2026-06-24')
    expect(range.from).toBe('2026-05-31T00:00:00.000Z')
    expect(range.to).toBe('2026-07-12T00:00:00.000Z')
  })
})

describe('stepAnchor', () => {
  it('steps by day, week, and month', () => {
    expect(stepAnchor('day', '2026-06-24', 1)).toBe('2026-06-25')
    expect(stepAnchor('week', '2026-06-24', -1)).toBe('2026-06-17')
    expect(stepAnchor('month', '2026-06-24', 1)).toBe('2026-07-24')
  })
})

describe('monthGrid', () => {
  it('returns six weeks of seven days starting on a Sunday', () => {
    const grid = monthGrid('2026-06-24')
    expect(grid).toHaveLength(6)
    expect(grid[0]).toHaveLength(7)
    expect(grid[0]?.[0]).toBe('2026-05-31')
    expect(grid[5]?.[6]).toBe('2026-07-11')
  })
})

describe('weekDays', () => {
  it('returns the seven days of the anchor week', () => {
    expect(weekDays('2026-06-24')).toEqual([
      '2026-06-21',
      '2026-06-22',
      '2026-06-23',
      '2026-06-24',
      '2026-06-25',
      '2026-06-26',
      '2026-06-27',
    ])
  })
})

describe('groupByDay', () => {
  it('buckets events by their local day and sorts each bucket', () => {
    const grouped = groupByDay(
      [
        event('late', '2026-06-24T15:00:00.000Z'),
        event('early', '2026-06-24T09:00:00.000Z'),
        event('other', '2026-06-25T09:00:00.000Z'),
      ],
      'UTC',
    )
    expect([...grouped.keys()]).toEqual(['2026-06-24', '2026-06-25'])
    expect(grouped.get('2026-06-24')?.map(e => e.id)).toEqual(['early', 'late'])
  })

  it('uses the supplied time zone to decide the day', () => {
    // 02:00Z on the 25th is still the 24th in New York (UTC-4 in June).
    expect(
      eventDay(event('x', '2026-06-25T02:00:00.000Z'), 'America/New_York'),
    ).toBe('2026-06-24')
  })

  it('keeps an all-day event on its UTC date regardless of time zone', () => {
    // UTC midnight of the 16th is 21:00 on the 15th in Sao Paulo; an all-day
    // event must still land on the 16th.
    const allDay = { ...event('ad', '2026-07-16T00:00:00.000Z'), allDay: true }
    expect(eventDay(allDay, 'America/Sao_Paulo')).toBe('2026-07-16')
  })
})
