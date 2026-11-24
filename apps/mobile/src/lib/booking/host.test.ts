import { describe, expect, it } from 'vitest'
import type { BookingView } from '@lifedeck/application'
import {
  bookingPageUrl,
  formatSlotMoment,
  minutesToTime,
  needsOutcome,
  partitionBookings,
  weeklyByDay,
  whatsappShareUrl,
} from '@/lib/booking/host'

const NOW = new Date('2026-06-22T12:00:00.000Z')

function booking(
  id: string,
  status: BookingView['status'],
  startsAt: string,
  endsAt: string,
): BookingView {
  return {
    id,
    serviceId: 'service',
    serviceName: 'Aula',
    client: null,
    startsAt,
    endsAt,
    status,
    source: 'public',
    calendarEventId: null,
    clientTimezone: null,
    note: null,
    cancelReason: null,
    createdAt: '2026-06-01T00:00:00.000Z',
  }
}

describe('booking host helpers', () => {
  it('formats minutes and groups the week Monday first', () => {
    expect(minutesToTime(545)).toBe('09:05')
    const week = weeklyByDay([
      { weekday: 1, startMinute: 840, endMinute: 1080 },
      { weekday: 1, startMinute: 540, endMinute: 720 },
      { weekday: 0, startMinute: 600, endMinute: 660 },
    ])
    expect(week.map(day => day.weekday)).toEqual([1, 2, 3, 4, 5, 6, 0])
    expect(week[0]!.windows).toEqual(['09:00-12:00', '14:00-18:00'])
    expect(week[1]!.windows).toEqual([])
    expect(week[6]!.windows).toEqual(['10:00-11:00'])
  })

  it('builds the public and WhatsApp links', () => {
    expect(bookingPageUrl('https://lifedeck.app//', 'ana')).toBe(
      'https://lifedeck.app/b/ana',
    )
    expect(whatsappShareUrl('Book: a b')).toBe(
      'https://wa.me/?text=Book%3A%20a%20b',
    )
  })

  it('formats a moment in the page zone', () => {
    expect(
      formatSlotMoment(
        '2026-06-23T13:00:00.000Z',
        'en-US',
        'America/Sao_Paulo',
      ),
    ).toContain('10:00')
  })

  it('puts requests first, then upcoming, then history newest first', () => {
    const buckets = partitionBookings(
      [
        booking(
          'old',
          'completed',
          '2026-06-01T10:00:00Z',
          '2026-06-01T11:00:00Z',
        ),
        booking(
          'late',
          'confirmed',
          '2026-06-25T10:00:00Z',
          '2026-06-25T11:00:00Z',
        ),
        booking(
          'soon',
          'confirmed',
          '2026-06-23T10:00:00Z',
          '2026-06-23T11:00:00Z',
        ),
        booking(
          'ask',
          'pending',
          '2026-06-24T10:00:00Z',
          '2026-06-24T11:00:00Z',
        ),
        booking(
          'done',
          'confirmed',
          '2026-06-20T10:00:00Z',
          '2026-06-20T11:00:00Z',
        ),
      ],
      NOW,
    )
    expect(buckets.pending.map(b => b.id)).toEqual(['ask'])
    expect(buckets.upcoming.map(b => b.id)).toEqual(['soon', 'late'])
    expect(buckets.past.map(b => b.id)).toEqual(['done', 'old'])
  })

  it('asks for an outcome only on an ended confirmed booking', () => {
    const ended = booking(
      'a',
      'confirmed',
      '2026-06-20T10:00:00.000Z',
      '2026-06-20T11:00:00.000Z',
    )
    expect(needsOutcome(ended, NOW)).toBe(true)
    expect(needsOutcome({ ...ended, status: 'completed' }, NOW)).toBe(false)
    expect(
      needsOutcome({ ...ended, endsAt: '2026-06-23T11:00:00.000Z' }, NOW),
    ).toBe(false)
  })
})
