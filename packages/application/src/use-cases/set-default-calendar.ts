import { asEntityId } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { CalendarConnectionRepository } from '@/ports/calendar-connection-repository'

type Dependencies = {
  calendarConnections: CalendarConnectionRepository
  clock: Clock
}

export function makeSetDefaultCalendar({
  calendarConnections,
  clock,
}: Dependencies) {
  return async function setDefaultCalendar(
    ownerId: string,
    connectionId: string,
  ): Promise<void> {
    const owner = asEntityId(ownerId)
    const connections = await calendarConnections.listByOwner(owner)
    const target = connections.find(
      connection => (connection.id as string) === connectionId,
    )
    if (!target) {
      throw new NotFoundError('Calendar connection')
    }

    for (const connection of connections) {
      const shouldBeDefault = connection.id === target.id
      if (connection.isDefault !== shouldBeDefault) {
        connection.markDefault(shouldBeDefault, clock.now())
        await calendarConnections.save(connection)
      }
    }
  }
}
