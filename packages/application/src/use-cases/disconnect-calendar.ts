import { asEntityId } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { CalendarConnectionRepository } from '@/ports/calendar-connection-repository'
import type { CalendarEventRepository } from '@/ports/calendar-event-repository'
import type { UnitOfWork } from '@/ports/unit-of-work'

type Dependencies = {
  calendarConnections: CalendarConnectionRepository
  calendarEvents: CalendarEventRepository
  clock: Clock
  unitOfWork: UnitOfWork
}

export function makeDisconnectCalendar({
  calendarConnections,
  calendarEvents,
  clock,
  unitOfWork,
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

    await unitOfWork.run(async () => {
      // Drop the events that came from this calendar so they do not linger as
      // orphans pointing at a connection that no longer exists.
      await calendarEvents.deleteByConnection(owner, connection.id)
      await calendarConnections.delete(connection.id)
      if (!connection.isDefault) {
        return
      }
      // Promote another connection so locally created events still have
      // somewhere to sync.
      const [next] = await calendarConnections.listByOwner(owner)
      if (!next) {
        return
      }
      next.markDefault(true, clock.now())
      await calendarConnections.save(next)
    })
  }
}
