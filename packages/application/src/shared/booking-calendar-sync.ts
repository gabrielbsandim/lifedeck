import type { EntityId } from '@lifedeck/domain'
import { SlotTakenError } from '@/errors/use-case-error'
import type { BookingRepository } from '@/ports/booking-repository'
import type { Clock } from '@/ports/clock'
import type { JobQueue } from '@/ports/job-queue'
import type { Logger } from '@/ports/logger'
import type { UnitOfWork } from '@/ports/unit-of-work'
import { bookingNoticeJobs } from '@/shared/booking-jobs'

type Dependencies = {
  bookings: BookingRepository
  jobQueue: JobQueue
  unitOfWork: UnitOfWork
  clock: Clock
  logger?: Logger
}

/**
 * The host edits a booking's event in Google: the pull reports it here so the
 * booking follows and the client hears about it. The calendar event is never
 * touched from this side, the remote change is the source of truth.
 */
export function makeBookingCalendarSync({
  bookings,
  jobQueue,
  unitOfWork,
  clock,
  logger,
}: Dependencies) {
  async function holdingBooking(eventId: EntityId) {
    const booking = await bookings.findByCalendarEventId(eventId)
    return booking?.holdsSlot ? booking : null
  }

  async function eventDeleted(eventId: EntityId): Promise<void> {
    const booking = await holdingBooking(eventId)
    if (!booking) {
      return
    }
    await unitOfWork.run(async () => {
      const now = clock.now()
      const outcome = booking.status === 'pending' ? 'declined' : 'cancelled'
      booking.linkCalendarEvent(null, now)
      if (outcome === 'declined') {
        booking.decline(null, now)
      } else {
        booking.cancel(null, now)
      }
      await bookings.save(booking)
      for (const job of bookingNoticeJobs(booking, outcome, {
        byClient: false,
        now,
      })) {
        await jobQueue.enqueue(job)
      }
    })
  }

  async function eventMoved(
    eventId: EntityId,
    startsAt: Date,
    endsAt: Date,
  ): Promise<void> {
    const booking = await holdingBooking(eventId)
    const unchanged =
      booking?.startsAt.getTime() === startsAt.getTime() &&
      booking.endsAt.getTime() === endsAt.getTime()
    if (!booking || unchanged) {
      return
    }
    try {
      await unitOfWork.run(async () => {
        const now = clock.now()
        booking.reschedule(startsAt, endsAt, now)
        await bookings.save(booking)
        for (const job of bookingNoticeJobs(booking, 'rescheduled', {
          byClient: false,
          now,
        })) {
          await jobQueue.enqueue(job)
        }
      })
    } catch (error) {
      // Moved on top of another booking: keep the booking where it was rather
      // than double-book; the host sees both in the calendar.
      if (!(error instanceof SlotTakenError)) {
        throw error
      }
      logger?.warn('booking_calendar_move_rejected', {
        bookingId: booking.id as string,
      })
    }
  }

  return { eventDeleted, eventMoved }
}

export type BookingCalendarSync = ReturnType<typeof makeBookingCalendarSync>
