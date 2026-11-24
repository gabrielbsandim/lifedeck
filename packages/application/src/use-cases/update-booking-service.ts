import {
  bookingServiceInputSchema,
  type BookingServiceInput,
  type BookingServiceView,
} from '@/dtos/booking-dto'
import { toBookingServiceView } from '@/mappers/booking-mapper'
import type { BookingServiceRepository } from '@/ports/booking-service-repository'
import type { Clock } from '@/ports/clock'
import { requireOwnService } from '@/shared/booking-context'

type Dependencies = {
  services: BookingServiceRepository
  clock: Clock
}

// Settings are replaced whole; held bookings keep the times they were given.
export function makeUpdateBookingService({ services, clock }: Dependencies) {
  return async function updateBookingService(
    ownerId: string,
    serviceId: string,
    input: BookingServiceInput,
  ): Promise<BookingServiceView> {
    const settings = bookingServiceInputSchema.parse(input)
    const service = await requireOwnService(services, ownerId, serviceId)
    service.update(settings, clock.now())
    await services.save(service)
    return toBookingServiceView(service)
  }
}
