import type { ManagedBookingView } from '@/dtos/booking-dto'
import type { CalendarEventRepository } from '@/ports/calendar-event-repository'
import type { Clock } from '@/ports/clock'
import {
  clientCanChange,
  type LoadManagedBooking,
  type ManagedBooking,
} from '@/shared/booking-context'

export function toManagedBookingView(
  { booking, service, page, client }: ManagedBooking,
  now: Date,
  meetingUrl: string | null = null,
): ManagedBookingView {
  const props = booking.toJSON()
  return {
    status: props.status,
    startsAt: props.startsAt.toISOString(),
    endsAt: props.endsAt.toISOString(),
    serviceId: service.id as string,
    serviceName: service.name,
    durationMin: service.durationMin,
    hostName: page.displayName,
    slug: page.slug,
    pageTimezone: page.timezone,
    clientName: client.name,
    clientTimezone: props.clientTimezone,
    location: meetingUrl
      ? { kind: service.location.kind, url: meetingUrl }
      : service.location,
    canChange: clientCanChange(booking, page, now),
  }
}

type Dependencies = {
  loadManagedBooking: LoadManagedBooking
  clock: Clock
  calendarEvents?: Pick<CalendarEventRepository, 'findById'>
}

export function makeGetManagedBooking({
  loadManagedBooking,
  clock,
  calendarEvents,
}: Dependencies) {
  // Read only: a public page view never triggers a push to Google.
  async function meetingUrl(managed: ManagedBooking): Promise<string | null> {
    const eventId = managed.booking.calendarEventId
    if (managed.service.location.kind !== 'online-meet' || !eventId) {
      return null
    }
    return (await calendarEvents?.findById(eventId))?.conferenceUrl ?? null
  }

  return async function getManagedBooking(
    token: string,
  ): Promise<ManagedBookingView> {
    const managed = await loadManagedBooking(token)
    return toManagedBookingView(managed, clock.now(), await meetingUrl(managed))
  }
}
