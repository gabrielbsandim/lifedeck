import type {
  Booking,
  BookingClient,
  BookingPage,
  BookingService,
} from '@lifedeck/domain'
import type {
  BookingClientView,
  BookingPageView,
  BookingServiceView,
  BookingView,
} from '@/dtos/booking-dto'

export function toBookingPageView(page: BookingPage): BookingPageView {
  const props = page.toJSON()
  return {
    id: props.id as string,
    slug: props.slug,
    displayName: props.displayName,
    headline: props.headline,
    timezone: props.timezone,
    locale: props.locale,
    cancelNoticeMin: props.cancelNoticeMin,
    active: props.active,
  }
}

export function toBookingServiceView(
  service: BookingService,
): BookingServiceView {
  const props = service.toJSON()
  return {
    id: props.id as string,
    name: props.name,
    description: props.description,
    durationMin: props.durationMin,
    slotStepMin: props.slotStepMin,
    bufferBeforeMin: props.bufferBeforeMin,
    bufferAfterMin: props.bufferAfterMin,
    minNoticeMin: props.minNoticeMin,
    maxHorizonDays: props.maxHorizonDays,
    maxPerDay: props.maxPerDay,
    location: props.location,
    priceLabel: props.priceLabel,
    requiresApproval: props.requiresApproval,
    active: props.active,
    position: props.position,
  }
}

export function toBookingClientView(client: BookingClient): BookingClientView {
  const props = client.toJSON()
  return {
    id: props.id as string,
    name: props.name,
    email: props.email,
    phone: props.phone,
    notes: props.notes,
    createdAt: props.createdAt.toISOString(),
  }
}

export function toBookingView(
  booking: Booking,
  service: BookingService | null,
  client: BookingClient | null,
): BookingView {
  const props = booking.toJSON()
  return {
    id: props.id as string,
    serviceId: props.serviceId as string,
    serviceName: service?.name ?? null,
    client: client ? toBookingClientView(client) : null,
    startsAt: props.startsAt.toISOString(),
    endsAt: props.endsAt.toISOString(),
    status: props.status,
    source: props.source,
    calendarEventId: props.calendarEventId as string | null,
    clientTimezone: props.clientTimezone,
    note: props.note,
    cancelReason: props.cancelReason,
    createdAt: props.createdAt.toISOString(),
  }
}
