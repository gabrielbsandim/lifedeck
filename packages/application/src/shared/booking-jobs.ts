import type { Booking } from '@lifedeck/domain'
import type { BookingNoticeKind } from '@/ports/email-sender'
import type { EnqueueJobInput } from '@/ports/job-queue'

export const BOOKING_NOTICE_JOB = 'booking-notice'
export const BOOKING_REMINDER_JOB = 'booking-reminder'

export const BOOKING_REMINDER_LEAD_MIN = 24 * 60
const MINUTE_MS = 60_000

export type BookingNoticeOptions = {
  byClient: boolean
  now: Date
  // The host's calendar could not be refreshed before this booking was taken.
  calendarStale?: boolean
}

export function bookingNoticeJobs(
  booking: Booking,
  kind: Exclude<BookingNoticeKind, 'reminder'>,
  options: BookingNoticeOptions,
): EnqueueJobInput[] {
  const notice: EnqueueJobInput = {
    type: BOOKING_NOTICE_JOB,
    payload: {
      bookingId: booking.id as string,
      kind,
      byClient: options.byClient,
      calendarStale: options.calendarStale === true,
    },
    runAt: options.now,
  }
  const reminderAt = new Date(
    booking.startsAt.getTime() - BOOKING_REMINDER_LEAD_MIN * MINUTE_MS,
  )
  if (booking.status !== 'confirmed' || reminderAt <= options.now) {
    return [notice]
  }
  const startsAt = booking.startsAt.toISOString()
  return [
    notice,
    {
      type: BOOKING_REMINDER_JOB,
      payload: { bookingId: booking.id as string, startsAt },
      runAt: reminderAt,
      // The start is part of the key so a moved booking gets a fresh reminder;
      // the handler drops the stale one.
      dedupKey: `booking:${booking.id as string}:${BOOKING_REMINDER_LEAD_MIN}:${startsAt}`,
    },
  ]
}
