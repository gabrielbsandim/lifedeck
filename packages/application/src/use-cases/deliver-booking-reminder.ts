import { asEntityId } from '@lifedeck/domain'
import { z } from 'zod'
import type { BookingRepository } from '@/ports/booking-repository'
import type { BookingMailer } from '@/shared/booking-notice'

const payloadSchema = z.object({
  bookingId: z.string(),
  startsAt: z.string().datetime(),
})

type Dependencies = {
  bookings: Pick<BookingRepository, 'findById'>
  mailer: BookingMailer
}

// A reminder armed for an older time, or for a booking since released, is
// dropped: the move or release already armed (or skipped) its own.
export function makeDeliverBookingReminder({ bookings, mailer }: Dependencies) {
  return async function deliverBookingReminder(
    raw: Record<string, unknown>,
  ): Promise<void> {
    const payload = payloadSchema.parse(raw)
    const booking = await bookings.findById(asEntityId(payload.bookingId))
    if (
      !booking ||
      booking.status !== 'confirmed' ||
      booking.startsAt.getTime() !== Date.parse(payload.startsAt)
    ) {
      return
    }
    const parts = await mailer.partsOf(booking)
    if (!parts) {
      return
    }
    await mailer.sendToClient(booking, 'reminder', parts)
  }
}
