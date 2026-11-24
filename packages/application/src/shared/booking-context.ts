import {
  asEntityId,
  type Booking,
  type BookingClient,
  type BookingPage,
  type BookingService,
} from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import type { BookingClientRepository } from '@/ports/booking-client-repository'
import type { BookingPageRepository } from '@/ports/booking-page-repository'
import type { BookingRepository } from '@/ports/booking-repository'
import type { BookingServiceRepository } from '@/ports/booking-service-repository'
import type { BookingTokenSigner } from '@/ports/booking-token-signer'
import type { EntitlementService } from '@/ports/entitlement-service'

export async function requireOwnPage(
  pages: Pick<BookingPageRepository, 'findByOwner'>,
  ownerId: string,
): Promise<BookingPage> {
  const page = await pages.findByOwner(asEntityId(ownerId))
  if (!page) {
    throw new NotFoundError('Booking page')
  }
  return page
}

export async function requireOwnService(
  services: Pick<BookingServiceRepository, 'findById'>,
  ownerId: string,
  serviceId: string,
): Promise<BookingService> {
  const service = await services.findById(asEntityId(serviceId))
  if (!service || !service.isOwnedBy(asEntityId(ownerId))) {
    throw new NotFoundError('Booking service')
  }
  return service
}

export async function requireOwnBooking(
  bookings: Pick<BookingRepository, 'findById'>,
  ownerId: string,
  bookingId: string,
): Promise<Booking> {
  const booking = await bookings.findById(asEntityId(bookingId))
  if (!booking || !booking.isOwnedBy(asEntityId(ownerId))) {
    throw new NotFoundError('Booking')
  }
  return booking
}

type PublicDependencies = {
  pages: Pick<BookingPageRepository, 'findBySlug'>
  services: Pick<BookingServiceRepository, 'findById' | 'listByPage'>
  entitlements: EntitlementService
}

// A page whose owner lost the plan, or switched it off, looks the same as one
// that never existed, so the public side leaks nothing about the account.
export function makeLoadPublicPage({
  pages,
  services,
  entitlements,
}: PublicDependencies) {
  async function page(slug: string): Promise<BookingPage> {
    const found = await pages.findBySlug(slug.trim().toLowerCase())
    if (!found || !found.active) {
      throw new NotFoundError('Booking page')
    }
    const granted = await entitlements.for(found.ownerId as string)
    if (!granted.entitlements.includes('booking')) {
      throw new NotFoundError('Booking page')
    }
    return found
  }

  async function service(
    bookingPage: BookingPage,
    serviceId: string,
  ): Promise<BookingService> {
    const found = await services.findById(asEntityId(serviceId))
    if (!found || !found.active || found.pageId !== bookingPage.id) {
      throw new NotFoundError('Booking service')
    }
    return found
  }

  async function activeServices(
    bookingPage: BookingPage,
  ): Promise<BookingService[]> {
    const all = await services.listByPage(bookingPage.id)
    return all.filter(candidate => candidate.active)
  }

  return { page, service, activeServices }
}

export type PublicPageLoader = ReturnType<typeof makeLoadPublicPage>

type TokenDependencies = {
  tokens: BookingTokenSigner
  bookings: Pick<BookingRepository, 'findById'>
  services: Pick<BookingServiceRepository, 'findById'>
  pages: Pick<BookingPageRepository, 'findById'>
  clients: Pick<BookingClientRepository, 'findById'>
}

export type ManagedBooking = {
  booking: Booking
  service: BookingService
  page: BookingPage
  client: BookingClient
}

export function makeLoadManagedBooking({
  tokens,
  bookings,
  services,
  pages,
  clients,
}: TokenDependencies) {
  return async function loadManagedBooking(
    token: string,
  ): Promise<ManagedBooking> {
    const bookingId = tokens.verify(token)
    const booking = bookingId
      ? await bookings.findById(asEntityId(bookingId))
      : null
    if (!booking) {
      throw new NotFoundError('Booking')
    }
    const [service, client] = await Promise.all([
      services.findById(booking.serviceId),
      clients.findById(booking.clientId),
    ])
    const page = service ? await pages.findById(service.pageId) : null
    if (!service || !client || !page) {
      throw new NotFoundError('Booking')
    }
    return { booking, service, page, client }
  }
}

export type LoadManagedBooking = ReturnType<typeof makeLoadManagedBooking>

/** A client may still change a booking that holds its slot, up to the page's notice. */
export function clientCanChange(
  booking: Booking,
  page: BookingPage,
  now: Date,
): boolean {
  const deadline = booking.startsAt.getTime() - page.cancelNoticeMin * 60_000
  return booking.holdsSlot && now.getTime() <= deadline
}
