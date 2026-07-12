import { asEntityId } from '@lifedeck/domain'
import type { CalendarConnectionView } from '@/dtos/calendar-connection-dto'
import { toCalendarConnectionView } from '@/mappers/calendar-connection-mapper'
import type { CalendarConnectionRepository } from '@/ports/calendar-connection-repository'

type Dependencies = {
  calendarConnections: CalendarConnectionRepository
}

export function makeListCalendarConnections({
  calendarConnections,
}: Dependencies) {
  return async function listCalendarConnections(
    ownerId: string,
  ): Promise<CalendarConnectionView[]> {
    const connections = await calendarConnections.listByOwner(
      asEntityId(ownerId),
    )
    return connections.map(toCalendarConnectionView)
  }
}
