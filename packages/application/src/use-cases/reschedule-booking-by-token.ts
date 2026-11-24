import {
  rescheduleByTokenSchema,
  type ManagedBookingView,
} from '@/dtos/booking-dto'
import { ForbiddenError, SlotTakenError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import {
  clientCanChange,
  type LoadManagedBooking,
} from '@/shared/booking-context'
import type { BookingLifecycle } from '@/shared/booking-records'
import {
  isSlotOpen,
  type RefreshHostCalendar,
  type ServiceSlots,
} from '@/shared/booking-slots'
import { toManagedBookingView } from '@/use-cases/get-managed-booking'

type Dependencies = {
  loadManagedBooking: LoadManagedBooking
  serviceSlots: ServiceSlots
  refreshHostCalendar: RefreshHostCalendar
  lifecycle: Pick<BookingLifecycle, 'move'>
  clock: Clock
}

export function makeRescheduleBookingByToken({
  loadManagedBooking,
  serviceSlots,
  refreshHostCalendar,
  lifecycle,
  clock,
}: Dependencies) {
  return async function rescheduleBookingByToken(
    token: string,
    input: { startsAt: string },
  ): Promise<ManagedBookingView> {
    const data = rescheduleByTokenSchema.parse(input)
    const managed = await loadManagedBooking(token)
    const { booking, page, service } = managed
    if (!clientCanChange(booking, page, clock.now())) {
      throw new ForbiddenError('booking')
    }
    const startsAt = new Date(data.startsAt)
    await refreshHostCalendar(page.ownerId as string)
    const open = await isSlotOpen(serviceSlots, page, service, startsAt, {
      exclude: booking,
    })
    if (!open) {
      throw new SlotTakenError()
    }
    await lifecycle.move(booking, service.durationMin, startsAt, true)
    return toManagedBookingView(managed, clock.now())
  }
}
