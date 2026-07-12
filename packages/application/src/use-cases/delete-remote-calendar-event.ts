import { asEntityId } from '@lifedeck/domain'
import type { CalendarConnectionRepository } from '@/ports/calendar-connection-repository'
import type { CalendarProvider } from '@/ports/calendar-provider'

type Dependencies = {
  calendarConnections: CalendarConnectionRepository
  provider: CalendarProvider
}

export function makeDeleteRemoteCalendarEvent({
  calendarConnections,
  provider,
}: Dependencies) {
  return async function deleteRemoteCalendarEvent(
    ownerId: string,
    externalId: string,
    connectionId?: string,
  ): Promise<{ deleted: boolean }> {
    const owner = asEntityId(ownerId)
    // Delete from the calendar the event lived in; fall back to the default so
    // events synced before connections were tagged still get cleaned up.
    const connection = connectionId
      ? await calendarConnections.findById(asEntityId(connectionId))
      : await calendarConnections.findDefaultByOwner(owner)
    if (!connection || !connection.isOwnedBy(owner)) {
      return { deleted: false }
    }
    await provider.deleteEvent(connection, externalId)
    return { deleted: true }
  }
}
