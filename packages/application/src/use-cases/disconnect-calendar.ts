import { asEntityId } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { CalendarConnectionRepository } from '@/ports/calendar-connection-repository'
import type { CalendarEventRepository } from '@/ports/calendar-event-repository'

type Dependencies = {
  calendarConnections: CalendarConnectionRepository
  calendarEvents: CalendarEventRepository
  clock: Clock
}

export function makeDisconnectCalendar({
  calendarConnections,
  calendarEvents,
  clock,
}: Dependencies) {
  return async function disconnectCalendar(
    ownerId: string,
    connectionId: string,
  ): Promise<void> {
    const owner = asEntityId(ownerId)
    const connection = await calendarConnections.findById(
      asEntityId(connectionId),
    )
    if (!connection || !connection.isOwnedBy(owner)) {
      throw new NotFoundError('Calendar connection')
    }

    // Drop the events that came from this calendar so they do not linger as
    // orphans pointing at a connection that no longer exists.
    await calendarEvents.deleteByConnection(owner, connection.id)
    await calendarConnections.delete(connection.id)

    // If we removed the default, promote another connection so locally created
    // events still have somewhere to sync.
    if (connection.isDefault) {
      const remaining = await calendarConnections.listByOwner(owner)
      const next = remaining[0]
      if (next) {
        next.markDefault(true, clock.now())
        await calendarConnections.save(next)
      }
    }
  }
}
