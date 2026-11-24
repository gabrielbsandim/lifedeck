import type { BookingView, SetAvailabilityInput } from '@lifedeck/application'

export type WeeklyWindowInput = SetAvailabilityInput['weekly'][number]
export type DayWindowDraft = { start: string; end: string }
export type WeekDraft = DayWindowDraft[][]

const DAY_MINUTES = 1440
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const
const MAX_SLUG = 40

export const DEFAULT_WEEKLY: readonly WeeklyWindowInput[] = [1, 2, 3, 4, 5].map(
  weekday => ({ weekday, startMinute: 9 * 60, endMinute: 17 * 60 }),
)

export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export function timeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) {
    return null
  }
  const minutes = Number(match[1]) * 60 + Number(match[2])
  if (Number(match[2]) > 59 || minutes > DAY_MINUTES) {
    return null
  }
  return minutes
}

export function weeklyToDraft(weekly: readonly WeeklyWindowInput[]): WeekDraft {
  return WEEKDAYS.map(weekday =>
    weekly
      .filter(window => window.weekday === weekday)
      .sort((a, b) => a.startMinute - b.startMinute)
      .map(window => ({
        start: minutesToTime(window.startMinute),
        end: minutesToTime(window.endMinute),
      })),
  )
}

export type DraftResult =
  | { ok: true; weekly: WeeklyWindowInput[] }
  | { ok: false; weekday: number }

function dayWindows(
  windows: readonly DayWindowDraft[],
): { startMinute: number; endMinute: number }[] | null {
  const parsed = windows.map(window => ({
    startMinute: timeToMinutes(window.start),
    endMinute: timeToMinutes(window.end),
  }))
  const valid = parsed.every(
    (window): window is { startMinute: number; endMinute: number } =>
      window.startMinute !== null &&
      window.endMinute !== null &&
      window.endMinute > window.startMinute,
  )
  if (!valid) {
    return null
  }
  const sorted = [...parsed].sort((a, b) => a.startMinute - b.startMinute)
  const overlaps = sorted.some(
    (window, index) =>
      index > 0 && window.startMinute < sorted[index - 1]!.endMinute,
  )
  return overlaps ? null : sorted
}

/** Validates the editor rows; the first broken weekday is reported back. */
export function draftToWeekly(draft: WeekDraft): DraftResult {
  const weekly: WeeklyWindowInput[] = []
  for (const weekday of WEEKDAYS) {
    const windows = dayWindows(draft[weekday] ?? [])
    if (!windows) {
      return { ok: false, weekday }
    }
    weekly.push(...windows.map(window => ({ weekday, ...window })))
  }
  return { ok: true, weekly }
}

/** Same shape as `draftToWeekly`, for a single date override. */
export function draftToWindows(
  windows: readonly DayWindowDraft[],
): { startMinute: number; endMinute: number }[] | null {
  return dayWindows(windows)
}

export function suggestSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG)
    .replace(/-+$/g, '')
}

export function bookingPageUrl(origin: string, slug: string): string {
  return `${origin.replace(/\/+$/, '')}/b/${slug}`
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
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

const ON_CALENDAR = new Set<BookingView['status']>([
  'pending',
  'confirmed',
  'completed',
  'no_show',
])

export function bookedEventIds(
  bookings: readonly BookingView[],
): ReadonlySet<string> {
  return new Set(
    bookings
      .filter(booking => ON_CALENDAR.has(booking.status))
      .flatMap(booking =>
        booking.calendarEventId ? [booking.calendarEventId] : [],
      ),
  )
}
