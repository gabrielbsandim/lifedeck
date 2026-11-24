import {
  bookingReasonSchema,
  type BookingReasonInput,
  type ManagedBookingView,
} from '@/dtos/booking-dto'
import { ForbiddenError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import {
  clientCanChange,
  type LoadManagedBooking,
} from '@/shared/booking-context'
import type { BookingLifecycle } from '@/shared/booking-records'
import { toManagedBookingView } from '@/use-cases/get-managed-booking'

type Dependencies = {
  loadManagedBooking: LoadManagedBooking
  lifecycle: Pick<BookingLifecycle, 'release'>
  clock: Clock
}

export function makeCancelBookingByToken({
  loadManagedBooking,
  lifecycle,
  clock,
}: Dependencies) {
  return async function cancelBookingByToken(
    token: string,
    input: BookingReasonInput = {},
  ): Promise<ManagedBookingView> {
    const { reason } = bookingReasonSchema.parse(input)
    const managed = await loadManagedBooking(token)
    if (!clientCanChange(managed.booking, managed.page, clock.now())) {
      throw new ForbiddenError('booking')
    }
    await lifecycle.release(managed.booking, 'cancelled', reason ?? null, true)
    return toManagedBookingView(managed, clock.now())
  }
}
