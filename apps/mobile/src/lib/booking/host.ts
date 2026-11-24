// Ported from apps/web/src/lib/booking/host.ts and slot-days.ts: the pure parts
// the phone's read-only host screen needs. Keep the two in sync.
import type { BookingSetupView, BookingView } from '@lifedeck/application'

type WeeklyWindow = BookingSetupView['weekly'][number]

// Monday first: the order people read a working week in.
export const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const

export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

/** One line per weekday, Monday first: the open windows as "09:00-12:00". */
export function weeklyByDay(
  weekly: readonly WeeklyWindow[],
): { weekday: number; windows: string[] }[] {
  return DISPLAY_ORDER.map(weekday => ({
    weekday,
    windows: weekly
      .filter(window => window.weekday === weekday)
      .sort((a, b) => a.startMinute - b.startMinute)
      .map(
        window =>
          `${minutesToTime(window.startMinute)}-${minutesToTime(window.endMinute)}`,
      ),
  }))
}

export function bookingPageUrl(origin: string, slug: string): string {
  return `${origin.replace(/\/+$/, '')}/b/${slug}`
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export function formatSlotMoment(
  iso: string,
  locale: string,
  timeZone: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export type BookingBuckets = {
  pending: BookingView[]
  upcoming: BookingView[]
  past: BookingView[]
}

const byStart = (a: BookingView, b: BookingView) =>
  a.startsAt.localeCompare(b.startsAt)

/**
 * Pending requests wait for the host whatever their date; confirmed ones are
 * upcoming until they end; everything else is history, newest first.
 */
export function partitionBookings(
  bookings: readonly BookingView[],
  now: Date,
): BookingBuckets {
  const nowIso = now.toISOString()
  const pending = bookings.filter(booking => booking.status === 'pending')
  const upcoming = bookings.filter(
    booking => booking.status === 'confirmed' && booking.endsAt > nowIso,
  )
  const past = bookings.filter(
    booking => !pending.includes(booking) && !upcoming.includes(booking),
  )
  return {
    pending: pending.sort(byStart),
    upcoming: upcoming.sort(byStart),
    past: past.sort((a, b) => byStart(b, a)),
  }
}

/** A past confirmed booking still needs the host to say how it went. */
export function needsOutcome(booking: BookingView, now: Date): boolean {
  return booking.status === 'confirmed' && booking.endsAt <= now.toISOString()
}
