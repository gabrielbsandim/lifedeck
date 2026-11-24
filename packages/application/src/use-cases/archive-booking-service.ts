import type { BookingServiceView } from '@/dtos/booking-dto'
import { toBookingServiceView } from '@/mappers/booking-mapper'
import type { BookingServiceRepository } from '@/ports/booking-service-repository'
import type { Clock } from '@/ports/clock'
import { requireOwnService } from '@/shared/booking-context'

type Dependencies = {
  services: BookingServiceRepository
  clock: Clock
}

// Archived, never deleted: past bookings still point at the service.
export function makeArchiveBookingService({ services, clock }: Dependencies) {
  return async function archiveBookingService(
    ownerId: string,
    serviceId: string,
  ): Promise<BookingServiceView> {
    const service = await requireOwnService(services, ownerId, serviceId)
    service.archive(clock.now())
    await services.save(service)
    return toBookingServiceView(service)
  }
}
