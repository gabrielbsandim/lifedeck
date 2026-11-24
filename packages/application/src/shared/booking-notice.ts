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
import type { CalendarEventRepository } from '@/ports/calendar-event-repository'
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
  calendarEvents?: Pick<CalendarEventRepository, 'findById'>
  // Pushes the event right away so Google hands back the Meet link before the
  // email goes out; the queued push job would only run after it.
  pushCalendarEvent?: (ownerId: string, eventId: string) => Promise<unknown>
}

export function makeBookingMailer({
  pages,
  services,
  clients,
  emailSender,
  tokens,
  appUrl,
  clock,
  calendarEvents,
  pushCalendarEvent,
}: Dependencies) {
  async function meetingUrl(
    booking: Booking,
    service: BookingService,
  ): Promise<string | null> {
    const eventId = booking.calendarEventId
    if (
      service.location.kind !== 'online-meet' ||
      !eventId ||
      !booking.holdsSlot ||
      !calendarEvents
    ) {
      return null
    }
    const event = await calendarEvents.findById(eventId)
    if (
      !event?.conferenceRequested ||
      event.conferenceUrl ||
      !pushCalendarEvent
    ) {
      return event?.conferenceUrl ?? null
    }
    try {
      await pushCalendarEvent(booking.ownerId as string, eventId as string)
    } catch {
      return null
    }
    return (await calendarEvents.findById(eventId))?.conferenceUrl ?? null
  }

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
      meetingUrl: await meetingUrl(booking, service),
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

  return { partsOf, sendToClient, meetingUrl }
}

export type BookingMailer = ReturnType<typeof makeBookingMailer>
