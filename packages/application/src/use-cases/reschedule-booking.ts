import {
  rescheduleBookingSchema,
  type BookingView,
  type RescheduleBookingInput,
} from '@/dtos/booking-dto'
import { SlotTakenError } from '@/errors/use-case-error'
import { toBookingView } from '@/mappers/booking-mapper'
import type { BookingClientRepository } from '@/ports/booking-client-repository'
import type { BookingPageRepository } from '@/ports/booking-page-repository'
import type { BookingRepository } from '@/ports/booking-repository'
import type { BookingServiceRepository } from '@/ports/booking-service-repository'
import {
  requireOwnBooking,
  requireOwnPage,
  requireOwnService,
} from '@/shared/booking-context'
import type { BookingLifecycle } from '@/shared/booking-records'
import { isSlotOpen, type ServiceSlots } from '@/shared/booking-slots'

type Dependencies = {
  bookings: Pick<BookingRepository, 'findById'>
  pages: Pick<BookingPageRepository, 'findByOwner'>
  services: Pick<BookingServiceRepository, 'findById'>
  clients: Pick<BookingClientRepository, 'findById'>
  serviceSlots: ServiceSlots
  lifecycle: Pick<BookingLifecycle, 'move'>
}

// Moves the booking in place, so the client keeps one booking and one link.
export function makeRescheduleBooking({
  bookings,
  pages,
  services,
  clients,
  serviceSlots,
  lifecycle,
}: Dependencies) {
  return async function rescheduleBooking(
    ownerId: string,
    bookingId: string,
    input: RescheduleBookingInput,
  ): Promise<BookingView> {
    const data = rescheduleBookingSchema.parse(input)
    const booking = await requireOwnBooking(bookings, ownerId, bookingId)
    const page = await requireOwnPage(pages, ownerId)
    const service = await requireOwnService(
      services,
      ownerId,
      booking.serviceId as string,
    )
    const startsAt = new Date(data.startsAt)
    const open =
      data.overrideAvailability === true ||
      (await isSlotOpen(serviceSlots, page, service, startsAt, {
        exclude: booking,
        asHost: true,
      }))
    if (!open) {
      throw new SlotTakenError()
    }
    await lifecycle.move(booking, service.durationMin, startsAt, false)
    return toBookingView(
      booking,
      service,
      await clients.findById(booking.clientId),
    )
  }
}
