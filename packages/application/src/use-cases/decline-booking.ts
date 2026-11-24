import {
  bookingReasonSchema,
  type BookingReasonInput,
} from '@/dtos/booking-dto'
import type { BookingRepository } from '@/ports/booking-repository'
import { requireOwnBooking } from '@/shared/booking-context'
import type { BookingLifecycle } from '@/shared/booking-records'

type Dependencies = {
  bookings: Pick<BookingRepository, 'findById'>
  lifecycle: Pick<BookingLifecycle, 'release'>
}

export function makeDeclineBooking({ bookings, lifecycle }: Dependencies) {
  return async function declineBooking(
    ownerId: string,
    bookingId: string,
    input: BookingReasonInput = {},
  ): Promise<void> {
    const { reason } = bookingReasonSchema.parse(input)
    const booking = await requireOwnBooking(bookings, ownerId, bookingId)
    await lifecycle.release(booking, 'declined', reason ?? null, false)
  }
}
