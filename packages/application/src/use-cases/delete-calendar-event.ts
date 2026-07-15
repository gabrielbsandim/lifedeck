import { asEntityId } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { CalendarEventRepository } from '@/ports/calendar-event-repository'
import type { JobQueue } from '@/ports/job-queue'
import { CALENDAR_DELETE_JOB } from '@/use-cases/calendar-sync-jobs'

type Dependencies = {
  calendarEvents: CalendarEventRepository
  jobQueue: JobQueue
  clock: Clock
}

export function makeDeleteCalendarEvent({
  calendarEvents,
  jobQueue,
  clock,
}: Dependencies) {
  return async function deleteCalendarEvent(
    ownerId: string,
    id: string,
  ): Promise<void> {
    const event = await calendarEvents.findById(asEntityId(id))
    if (!event || !event.isOwnedBy(asEntityId(ownerId))) {
      throw new NotFoundError('Calendar event')
    }
    const externalId = event.externalId
    const connectionId = event.connectionId
    await calendarEvents.delete(asEntityId(id))

    // Deleting a recurring series ("all events") also drops its occurrence
    // overrides so they cannot resurface as orphaned occurrences. The provider
    // deletes the series (and its exceptions) remotely on its own.
    if (event.recurrence && externalId) {
      await calendarEvents.deleteOverridesByMasterExternalId(
        asEntityId(ownerId),
        externalId,
      )
    }

    if (externalId) {
      await jobQueue.enqueue({
        type: CALENDAR_DELETE_JOB,
        payload: {
          userId: ownerId,
          externalId,
          ...(connectionId ? { connectionId: connectionId as string } : {}),
        },
        runAt: clock.now(),
      })
    }
  }
}
