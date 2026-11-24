import { markBookingOutcomeSchema } from '@/dtos/booking-dto'
import type { BookingRepository } from '@/ports/booking-repository'
import type { Clock } from '@/ports/clock'
import { requireOwnBooking } from '@/shared/booking-context'

type Dependencies = {
  bookings: Pick<BookingRepository, 'findById' | 'save'>
  clock: Clock
}

export function makeMarkBookingOutcome({ bookings, clock }: Dependencies) {
  return async function markBookingOutcome(
    ownerId: string,
    bookingId: string,
    input: { outcome: 'completed' | 'no_show' },
  ): Promise<void> {
    const { outcome } = markBookingOutcomeSchema.parse(input)
    const booking = await requireOwnBooking(bookings, ownerId, bookingId)
    booking.markOutcome(outcome, clock.now())
    await bookings.save(booking)
  }
}
