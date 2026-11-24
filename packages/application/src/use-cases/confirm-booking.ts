import type { BookingRepository } from '@/ports/booking-repository'
import { requireOwnBooking } from '@/shared/booking-context'
import type { BookingLifecycle } from '@/shared/booking-records'

type Dependencies = {
  bookings: Pick<BookingRepository, 'findById'>
  lifecycle: Pick<BookingLifecycle, 'confirm'>
}

export function makeConfirmBooking({ bookings, lifecycle }: Dependencies) {
  return async function confirmBooking(
    ownerId: string,
    bookingId: string,
  ): Promise<void> {
    const booking = await requireOwnBooking(bookings, ownerId, bookingId)
    await lifecycle.confirm(booking)
  }
}
