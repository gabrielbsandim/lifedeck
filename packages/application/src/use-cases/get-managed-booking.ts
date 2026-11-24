import type { ManagedBookingView } from '@/dtos/booking-dto'
import type { Clock } from '@/ports/clock'
import {
  clientCanChange,
  type LoadManagedBooking,
  type ManagedBooking,
} from '@/shared/booking-context'

export function toManagedBookingView(
  { booking, service, page, client }: ManagedBooking,
  now: Date,
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
    location: service.location,
    canChange: clientCanChange(booking, page, now),
  }
}

type Dependencies = {
  loadManagedBooking: LoadManagedBooking
  clock: Clock
}

export function makeGetManagedBooking({
  loadManagedBooking,
  clock,
}: Dependencies) {
  return async function getManagedBooking(
    token: string,
  ): Promise<ManagedBookingView> {
    return toManagedBookingView(await loadManagedBooking(token), clock.now())
  }
}
