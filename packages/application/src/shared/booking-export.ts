import type { EntityId } from '@lifedeck/domain'
import type {
  BookingClientView,
  BookingPageView,
  BookingServiceView,
  BookingSetupView,
  BookingView,
} from '@/dtos/booking-dto'
import {
  toBookingClientView,
  toBookingPageView,
  toBookingServiceView,
  toBookingView,
} from '@/mappers/booking-mapper'
import type { AvailabilityRepository } from '@/ports/availability-repository'
import type { BookingClientRepository } from '@/ports/booking-client-repository'
import type { BookingPageRepository } from '@/ports/booking-page-repository'
import type { BookingRepository } from '@/ports/booking-repository'
import type { BookingServiceRepository } from '@/ports/booking-service-repository'

// The whole history, not a window: an export that drops old bookings is not one.
const ALL_FROM = new Date('1970-01-01T00:00:00.000Z')
const ALL_TO = new Date('2200-01-01T00:00:00.000Z')

export type BookingDataExport = {
  page: BookingPageView | null
  services: BookingServiceView[]
  weekly: BookingSetupView['weekly']
  overrides: BookingSetupView['overrides']
  clients: BookingClientView[]
  bookings: BookingView[]
}

export type BookingExportDeps = {
  pages: Pick<BookingPageRepository, 'findByOwner'>
  services: Pick<BookingServiceRepository, 'listByPage'>
  availability: Pick<AvailabilityRepository, 'getWeekly' | 'listOverrides'>
  clients: Pick<BookingClientRepository, 'listByOwner'>
  bookings: Pick<BookingRepository, 'listByOwnerInRange'>
}

export async function exportBookingData(
  deps: BookingExportDeps,
  owner: EntityId,
): Promise<BookingDataExport | null> {
  const [page, clients, bookings] = await Promise.all([
    deps.pages.findByOwner(owner),
    deps.clients.listByOwner(owner),
    deps.bookings.listByOwnerInRange(owner, ALL_FROM, ALL_TO),
  ])
  if (!page && clients.length === 0) {
    return null
  }
  const [services, weekly, overrides] = page
    ? await Promise.all([
        deps.services.listByPage(page.id),
        deps.availability.getWeekly(page.id),
        deps.availability.listOverrides(page.id, '1970-01-01', '2199-12-31'),
      ])
    : [[], [], []]
  const serviceById = new Map(services.map(service => [service.id, service]))
  const clientById = new Map(clients.map(client => [client.id, client]))
  return {
    page: page ? toBookingPageView(page) : null,
    services: services.map(toBookingServiceView),
    weekly,
    overrides,
    clients: clients.map(toBookingClientView),
    bookings: bookings.map(booking =>
      toBookingView(
        booking,
        serviceById.get(booking.serviceId) ?? null,
        clientById.get(booking.clientId) ?? null,
      ),
    ),
  }
}
