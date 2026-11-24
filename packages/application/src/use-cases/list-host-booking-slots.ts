import {
  listBookableSlotsQuerySchema,
  type BookableSlotView,
  type ListBookableSlotsQuery,
} from '@/dtos/booking-dto'
import { NotFoundError } from '@/errors/use-case-error'
import type { BookingPageRepository } from '@/ports/booking-page-repository'
import type { BookingServiceRepository } from '@/ports/booking-service-repository'
import { requireOwnPage, requireOwnService } from '@/shared/booking-context'
import type { ServiceSlots } from '@/shared/booking-slots'

const MAX_RANGE_MS = 31 * 24 * 60 * 60_000

type Dependencies = {
  pages: Pick<BookingPageRepository, 'findByOwner'>
  services: Pick<BookingServiceRepository, 'findById'>
  serviceSlots: ServiceSlots
}

// The host's view of the free slots: no notice or horizon limit, since the host
// books on the client's behalf and knows when they can make it.
export function makeListHostBookingSlots({
  pages,
  services,
  serviceSlots,
}: Dependencies) {
  return async function listHostBookingSlots(
    ownerId: string,
    query: ListBookableSlotsQuery,
  ): Promise<BookableSlotView[]> {
    const data = listBookableSlotsQuerySchema.parse(query)
    const page = await requireOwnPage(pages, ownerId)
    const service = await requireOwnService(services, ownerId, data.serviceId)
    if (!service.active) {
      throw new NotFoundError('Booking service')
    }
    const from = new Date(data.from)
    const to = new Date(
      Math.min(Date.parse(data.to), from.getTime() + MAX_RANGE_MS),
    )
    if (to <= from) {
      return []
    }
    const slots = await serviceSlots(page, service, from, to, { asHost: true })
    return slots.map(slot => ({
      startsAt: slot.start.toISOString(),
      endsAt: slot.end.toISOString(),
    }))
  }
}
