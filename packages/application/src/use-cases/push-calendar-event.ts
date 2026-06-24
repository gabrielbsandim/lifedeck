import { asEntityId } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { CalendarConnectionRepository } from '@/ports/calendar-connection-repository'
import type { CalendarEventRepository } from '@/ports/calendar-event-repository'
import type { CalendarProvider } from '@/ports/calendar-provider'

type Dependencies = {
  calendarConnections: CalendarConnectionRepository
  calendarEvents: CalendarEventRepository
  provider: CalendarProvider
  clock: Clock
}

export function makePushCalendarEvent({
  calendarConnections,
  calendarEvents,
  provider,
  clock,
}: Dependencies) {
  return async function pushCalendarEvent(
    ownerId: string,
    eventId: string,
  ): Promise<{ pushed: boolean }> {
    const owner = asEntityId(ownerId)
    const connection = await calendarConnections.findByOwner(owner)
    if (!connection) {
      // No calendar connected: nothing to push, not an error.
      return { pushed: false }
    }

    const event = await calendarEvents.findById(asEntityId(eventId))
    if (!event || !event.isOwnedBy(owner)) {
      throw new NotFoundError('Calendar event')
    }

    const { externalId, etag } = await provider.pushEvent(connection, event)
    event.linkToExternal(externalId, etag, clock.now())
    await calendarEvents.save(event)
    return { pushed: true }
  }
}
