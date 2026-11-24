import type {
  Booking,
  BookingClient,
  BookingPage,
  BookingService,
} from '@lifedeck/domain'
import type { BookingClientRepository } from '@/ports/booking-client-repository'
import type { BookingPageRepository } from '@/ports/booking-page-repository'
import type { BookingServiceRepository } from '@/ports/booking-service-repository'
import type { BookingTokenSigner } from '@/ports/booking-token-signer'
import type { Clock } from '@/ports/clock'
import {
  toEmailLocale,
  type BookingNotice,
  type BookingNoticeKind,
  type EmailSender,
} from '@/ports/email-sender'

export type BookingParts = {
  page: BookingPage
  service: BookingService
  client: BookingClient
}

type Dependencies = {
  pages: Pick<BookingPageRepository, 'findById'>
  services: Pick<BookingServiceRepository, 'findById'>
  clients: Pick<BookingClientRepository, 'findById'>
  emailSender: EmailSender
  tokens: BookingTokenSigner
  appUrl: string
  clock: Clock
}

export function makeBookingMailer({
  pages,
  services,
  clients,
  emailSender,
  tokens,
  appUrl,
  clock,
}: Dependencies) {
  async function partsOf(booking: Booking): Promise<BookingParts | null> {
    const [service, client] = await Promise.all([
      services.findById(booking.serviceId),
      clients.findById(booking.clientId),
    ])
    const page = service ? await pages.findById(service.pageId) : null
    if (!service || !client || !page) {
      return null
    }
    return { page, service, client }
  }

  // The link is pointless once the booking is released or over.
  function manageUrl(booking: Booking): string | null {
    if (!booking.holdsSlot || booking.endsAt <= clock.now()) {
      return null
    }
    const base = appUrl.replace(/\/$/, '')
    return `${base}/b/manage/${tokens.sign(booking.id as string)}`
  }

  async function sendToClient(
    booking: Booking,
    kind: BookingNoticeKind,
    { page, service, client }: BookingParts,
  ): Promise<void> {
    if (!client.email) {
      return
    }
    const props = booking.toJSON()
    const notice: BookingNotice = {
      kind,
      bookingId: props.id as string,
      serviceName: service.name,
      hostName: page.displayName,
      clientName: client.name,
      startsAt: props.startsAt,
      endsAt: props.endsAt,
      timeZone: props.clientTimezone ?? page.timezone,
      location: service.location,
      manageUrl: manageUrl(booking),
      reason: props.cancelReason,
      sequence: Math.floor(props.updatedAt.getTime() / 1000),
    }
    await emailSender.sendBookingNotice(
      client.email,
      notice,
      toEmailLocale(page.locale),
    )
  }

  return { partsOf, sendToClient }
}

export type BookingMailer = ReturnType<typeof makeBookingMailer>
