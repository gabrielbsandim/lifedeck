import { asEntityId, ValidationError } from '@lifedeck/domain'
import {
  listBookingsQuerySchema,
  type BookingView,
  type ListBookingsQuery,
} from '@/dtos/booking-dto'
import { toBookingView } from '@/mappers/booking-mapper'
import type { BookingClientRepository } from '@/ports/booking-client-repository'
import type { BookingPageRepository } from '@/ports/booking-page-repository'
import type { BookingRepository } from '@/ports/booking-repository'
import type { BookingServiceRepository } from '@/ports/booking-service-repository'

const MAX_RANGE_MS = 400 * 24 * 60 * 60_000

type Dependencies = {
  bookings: Pick<BookingRepository, 'listByOwnerInRange'>
  pages: Pick<BookingPageRepository, 'findByOwner'>
  services: Pick<BookingServiceRepository, 'listByPage'>
  clients: Pick<BookingClientRepository, 'listByOwner'>
}

export function makeListBookings({
  bookings,
  pages,
  services,
  clients,
}: Dependencies) {
  return async function listBookings(
    ownerId: string,
    query: ListBookingsQuery,
  ): Promise<BookingView[]> {
    const data = listBookingsQuerySchema.parse(query)
    const from = new Date(data.from)
    const to = new Date(data.to)
    const span = to.getTime() - from.getTime()
    if (span <= 0 || span > MAX_RANGE_MS) {
      throw new ValidationError(
        'The range must be positive and at most 400 days.',
      )
    }
    const owner = asEntityId(ownerId)
    const page = await pages.findByOwner(owner)
    const [found, pageServices, ownerClients] = await Promise.all([
      bookings.listByOwnerInRange(owner, from, to),
      page ? services.listByPage(page.id) : Promise.resolve([]),
      clients.listByOwner(owner),
    ])
    const wanted = data.status ? new Set(data.status) : null
    const serviceById = new Map(pageServices.map(s => [s.id, s]))
    const clientById = new Map(ownerClients.map(c => [c.id, c]))
    return found
      .filter(booking => wanted === null || wanted.has(booking.status))
      .map(booking =>
        toBookingView(
          booking,
          serviceById.get(booking.serviceId) ?? null,
          clientById.get(booking.clientId) ?? null,
        ),
      )
  }
}
