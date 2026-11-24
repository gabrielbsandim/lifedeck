import { asEntityId } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { CalendarConnectionRepository } from '@/ports/calendar-connection-repository'
import type { UnitOfWork } from '@/ports/unit-of-work'

type Dependencies = {
  calendarConnections: CalendarConnectionRepository
  clock: Clock
  unitOfWork: UnitOfWork
}

export function makeSetDefaultCalendar({
  calendarConnections,
  clock,
  unitOfWork,
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

    const changed = connections.filter(
      connection => connection.isDefault !== (connection.id === target.id),
    )
    await unitOfWork.run(async () => {
      for (const connection of changed) {
        connection.markDefault(connection.id === target.id, clock.now())
        await calendarConnections.save(connection)
      }
    })
  }
}
