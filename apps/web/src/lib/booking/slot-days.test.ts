import { describe, expect, it } from 'vitest'
import {
  civilDate,
  formatSlotDay,
  formatSlotMoment,
  formatSlotTime,
  groupSlotsByDay,
  slotWindow,
  timeZoneOptions,
} from '@/lib/booking/slot-days'

const slot = (startsAt: string) => ({ startsAt, endsAt: startsAt })

describe('slot days', () => {
  it('reads the civil date in the viewer zone', () => {
    expect(civilDate('2026-06-23T02:00:00.000Z', 'UTC')).toBe('2026-06-23')
    expect(civilDate('2026-06-23T02:00:00.000Z', 'America/Sao_Paulo')).toBe(
      '2026-06-22',
    )
  })

  it('groups slots by day in order', () => {
    const days = groupSlotsByDay(
      [
        slot('2026-06-22T23:00:00.000Z'),
        slot('2026-06-23T10:00:00.000Z'),
        slot('2026-06-23T11:00:00.000Z'),
      ],
      'UTC',
    )
    expect(days.map(day => [day.date, day.slots.length])).toEqual([
      ['2026-06-22', 1],
      ['2026-06-23', 2],
    ])
  })

  it('formats times and days for the locale', () => {
    expect(formatSlotTime('2026-06-23T13:30:00.000Z', 'pt-BR', 'UTC')).toBe(
      '13:30',
    )
    expect(formatSlotDay('2026-06-23', 'en-US')).toBe('Tue, Jun 23')
    expect(
      formatSlotMoment('2026-06-23T13:30:00.000Z', 'en-US', 'UTC'),
    ).toContain('Tuesday')
  })

  it('builds a query window of whole days', () => {
    expect(slotWindow(new Date('2026-06-21T12:00:00.000Z'), 7)).toEqual({
      from: '2026-06-21T12:00:00.000Z',
      to: '2026-06-28T12:00:00.000Z',
    })
  })

  it('keeps the viewer zone selectable even when the list lacks it', () => {
    expect(timeZoneOptions('UTC')).toContain('America/Sao_Paulo')
    expect(timeZoneOptions('Mars/Base')[0]).toBe('Mars/Base')
  })
})
