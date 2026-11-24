import { describe, expect, it } from 'vitest'
import type { BookingView } from '@lifedeck/application'
import {
  DEFAULT_WEEKLY,
  bookedEventIds,
  bookingPageUrl,
  draftToWeekly,
  draftToWindows,
  minutesToTime,
  needsOutcome,
  partitionBookings,
  suggestSlug,
  timeToMinutes,
  weeklyToDraft,
  whatsappShareUrl,
} from '@/lib/booking/host'

const NOW = new Date('2026-06-20T12:00:00.000Z')

function booking(overrides: Partial<BookingView>): BookingView {
  return {
    id: crypto.randomUUID(),
    serviceId: crypto.randomUUID(),
    serviceName: 'Class',
    client: null,
    startsAt: '2026-06-21T10:00:00.000Z',
    endsAt: '2026-06-21T10:30:00.000Z',
    status: 'confirmed',
    source: 'public',
    calendarEventId: null,
    clientTimezone: null,
    note: null,
    cancelReason: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('time fields', () => {
  it('round-trips minutes and clock strings', () => {
    expect(minutesToTime(0)).toBe('00:00')
    expect(minutesToTime(9 * 60 + 5)).toBe('09:05')
    expect(minutesToTime(1440)).toBe('24:00')
    expect(timeToMinutes('9:30')).toBe(570)
    expect(timeToMinutes('24:00')).toBe(1440)
  })

  it('rejects malformed or out of range times', () => {
    expect(timeToMinutes('')).toBeNull()
    expect(timeToMinutes('10:75')).toBeNull()
    expect(timeToMinutes('24:30')).toBeNull()
    expect(timeToMinutes('ten')).toBeNull()
  })
})

describe('weekly draft', () => {
  it('turns stored windows into seven sorted day rows', () => {
    const draft = weeklyToDraft([
      { weekday: 1, startMinute: 840, endMinute: 1020 },
      { weekday: 1, startMinute: 540, endMinute: 720 },
    ])
    expect(draft).toHaveLength(7)
    expect(draft[0]).toEqual([])
    expect(draft[1]).toEqual([
      { start: '09:00', end: '12:00' },
      { start: '14:00', end: '17:00' },
    ])
  })

  it('round-trips the default week', () => {
    const result = draftToWeekly(weeklyToDraft(DEFAULT_WEEKLY))
    expect(result).toEqual({ ok: true, weekly: [...DEFAULT_WEEKLY] })
  })

  it('reports the first day with an inverted or overlapping window', () => {
    const inverted = weeklyToDraft([])
    inverted[3] = [{ start: '12:00', end: '09:00' }]
    expect(draftToWeekly(inverted)).toEqual({ ok: false, weekday: 3 })

    const overlap = weeklyToDraft([])
    overlap[2] = [
      { start: '13:00', end: '15:00' },
      { start: '09:00', end: '13:30' },
    ]
    expect(draftToWeekly(overlap)).toEqual({ ok: false, weekday: 2 })
  })

  it('validates a single override day', () => {
    expect(draftToWindows([])).toEqual([])
    expect(draftToWindows([{ start: '08:00', end: 'x' }])).toBeNull()
    expect(draftToWindows([{ start: '08:00', end: '10:00' }])).toEqual([
      { startMinute: 480, endMinute: 600 },
    ])
  })
})

describe('links', () => {
  it('suggests a valid slug from a display name', () => {
    expect(suggestSlug('  Ana Lúcia Inglês! ')).toBe('ana-lucia-ingles')
    expect(suggestSlug('a'.repeat(39) + ' b')).toBe('a'.repeat(39))
  })

  it('builds the public link and the WhatsApp share link', () => {
    expect(bookingPageUrl('https://app.test/', 'ana')).toBe(
      'https://app.test/b/ana',
    )
    expect(whatsappShareUrl('Book: https://app.test/b/ana')).toBe(
      'https://wa.me/?text=Book%3A%20https%3A%2F%2Fapp.test%2Fb%2Fana',
    )
  })
})

describe('booking buckets', () => {
  it('splits pending, upcoming and past in reading order', () => {
    const later = booking({
      startsAt: '2026-06-22T10:00:00.000Z',
      endsAt: '2026-06-22T10:30:00.000Z',
    })
    const sooner = booking({})
    const pending = booking({ status: 'pending' })
    const done = booking({
      startsAt: '2026-06-19T10:00:00.000Z',
      endsAt: '2026-06-19T10:30:00.000Z',
    })
    const cancelled = booking({
      status: 'cancelled',
      startsAt: '2026-06-18T10:00:00.000Z',
    })
    const buckets = partitionBookings(
      [later, cancelled, pending, done, sooner],
      NOW,
    )
    expect(buckets.pending).toEqual([pending])
    expect(buckets.upcoming).toEqual([sooner, later])
    expect(buckets.past).toEqual([done, cancelled])
    expect(needsOutcome(done, NOW)).toBe(true)
    expect(needsOutcome(sooner, NOW)).toBe(false)
    expect(needsOutcome(cancelled, NOW)).toBe(false)
  })

  it('collects the calendar events that belong to live bookings', () => {
    const ids = bookedEventIds([
      booking({ calendarEventId: 'e1' }),
      booking({ calendarEventId: 'e2', status: 'cancelled' }),
      booking({ calendarEventId: null }),
      booking({ calendarEventId: 'e3', status: 'completed' }),
    ])
    expect([...ids]).toEqual(['e1', 'e3'])
  })
})
