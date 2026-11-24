import { asEntityId, type BookingSource } from '@lifedeck/domain'
import {
  createBookingForClientSchema,
  type BookingView,
  type CreateBookingForClientInput,
} from '@/dtos/booking-dto'
import { NotFoundError, SlotTakenError } from '@/errors/use-case-error'
import { toBookingView } from '@/mappers/booking-mapper'
import type { BookingClientRepository } from '@/ports/booking-client-repository'
import type { BookingPageRepository } from '@/ports/booking-page-repository'
import type { BookingServiceRepository } from '@/ports/booking-service-repository'
import { requireOwnPage, requireOwnService } from '@/shared/booking-context'
import type { BookingLifecycle } from '@/shared/booking-records'
import { isSlotOpen, type ServiceSlots } from '@/shared/booking-slots'

type Dependencies = {
  pages: Pick<BookingPageRepository, 'findByOwner'>
  services: Pick<BookingServiceRepository, 'findById'>
  clients: Pick<BookingClientRepository, 'findById'>
  serviceSlots: ServiceSlots
  lifecycle: Pick<BookingLifecycle, 'open'>
}

/**
 * The host books for a known client, by id: callers look the client up first,
 * so a name never turns into a second client. Skips notice and horizon, and
 * with `overrideAvailability` the published hours too; overlaps stay refused.
 */
export function makeCreateBookingForClient({
  pages,
  services,
  clients,
  serviceSlots,
  lifecycle,
}: Dependencies) {
  return async function createBookingForClient(
    ownerId: string,
    input: CreateBookingForClientInput,
    source: Exclude<BookingSource, 'public'> = 'host',
  ): Promise<BookingView> {
    const data = createBookingForClientSchema.parse(input)
    const page = await requireOwnPage(pages, ownerId)
    const service = await requireOwnService(services, ownerId, data.serviceId)
    if (!service.active) {
      throw new NotFoundError('Booking service')
    }
    const client = await clients.findById(asEntityId(data.clientId))
    if (!client || !client.isOwnedBy(page.ownerId)) {
      throw new NotFoundError('Client')
    }
    const startsAt = new Date(data.startsAt)
    const open =
      data.overrideAvailability === true ||
      (await isSlotOpen(serviceSlots, page, service, startsAt, {
        asHost: true,
      }))
    if (!open) {
      throw new SlotTakenError()
    }
    const booking = await lifecycle.open({
      page,
      service,
      client,
      startsAt,
      source,
      requiresApproval: false,
      note: data.note,
      byClient: false,
    })
    return toBookingView(booking, service, client)
  }
}
