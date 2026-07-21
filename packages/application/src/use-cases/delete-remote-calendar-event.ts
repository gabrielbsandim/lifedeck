import { asEntityId } from '@lifedeck/domain'
import type { CalendarConnectionRepository } from '@/ports/calendar-connection-repository'
import type { CalendarProviderRegistry } from '@/ports/calendar-provider'

type Dependencies = {
  calendarConnections: CalendarConnectionRepository
  providers: CalendarProviderRegistry
}

export function makeDeleteRemoteCalendarEvent({
  calendarConnections,
  providers,
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
    const provider = providers.get(connection.provider)
    // Read-only providers (e.g. cal.com) accept no remote writes.
    if (provider.writable === false) {
      return { deleted: false }
    }
    await provider.deleteEvent(connection, externalId)
    return { deleted: true }
  }
}
