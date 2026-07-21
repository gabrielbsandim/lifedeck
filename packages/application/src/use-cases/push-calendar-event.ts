import { asEntityId } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { CalendarConnectionRepository } from '@/ports/calendar-connection-repository'
import type { CalendarEventRepository } from '@/ports/calendar-event-repository'
import type { CalendarProviderRegistry } from '@/ports/calendar-provider'

type Dependencies = {
  calendarConnections: CalendarConnectionRepository
  calendarEvents: CalendarEventRepository
  providers: CalendarProviderRegistry
  clock: Clock
}

export function makePushCalendarEvent({
  calendarConnections,
  calendarEvents,
  providers,
  clock,
}: Dependencies) {
  return async function pushCalendarEvent(
    ownerId: string,
    eventId: string,
  ): Promise<{ pushed: boolean }> {
    const owner = asEntityId(ownerId)
    const event = await calendarEvents.findById(asEntityId(eventId))
    if (!event || !event.isOwnedBy(owner)) {
      throw new NotFoundError('Calendar event')
    }

    // A synced event pushes back to its own calendar; a brand-new local event
    // goes to the user's default calendar.
    const connection = event.connectionId
      ? await calendarConnections.findById(event.connectionId)
      : await calendarConnections.findDefaultByOwner(owner)
    if (!connection || !connection.isOwnedBy(owner)) {
      // No calendar connected (or the target was removed): nothing to push.
      return { pushed: false }
    }

    const provider = providers.get(connection.provider)
    // Read-only providers (e.g. cal.com) import events but accept no writes.
    if (provider.writable === false) {
      return { pushed: false }
    }
    const { externalId, etag } = await provider.pushEvent(connection, event)
    event.linkToExternal(externalId, etag, clock.now(), connection.id)
    await calendarEvents.save(event)
    return { pushed: true }
  }
}
