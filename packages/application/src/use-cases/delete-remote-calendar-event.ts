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
  ): Promise<{ deleted: boolean }> {
    const connection = await calendarConnections.findByOwner(
      asEntityId(ownerId),
    )
    if (!connection) {
      return { deleted: false }
    }
    await provider.deleteEvent(connection, externalId)
    return { deleted: true }
  }
}
