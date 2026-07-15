import { CalendarEvent, ValidationError, asEntityId } from '@lifedeck/domain'
import { deleteCalendarOccurrenceSchema } from '@/dtos/calendar-event-dto'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { CalendarEventRepository } from '@/ports/calendar-event-repository'
import type { JobQueue } from '@/ports/job-queue'
import { CALENDAR_PUSH_JOB } from '@/use-cases/calendar-sync-jobs'

type Dependencies = {
  calendarEvents: CalendarEventRepository
  jobQueue: JobQueue
  ids: IdGenerator
  clock: Clock
}

// Removes a single occurrence of a recurring series ("this event only") by
// marking an override cancelled and pushing the cancellation to the provider.
// The series master and its other occurrences are untouched.
export function makeDeleteCalendarOccurrence({
  calendarEvents,
  jobQueue,
  ids,
  clock,
}: Dependencies) {
  return async function deleteCalendarOccurrence(
    ownerId: string,
    seriesId: string,
    occurrenceStart: string,
  ): Promise<void> {
    const data = deleteCalendarOccurrenceSchema.parse({ occurrenceStart })
    const owner = asEntityId(ownerId)

    const master = await calendarEvents.findById(asEntityId(seriesId))
    if (!master || !master.isOwnedBy(owner) || !master.recurrence) {
      throw new NotFoundError('Calendar event')
    }
    if (!master.externalId) {
      throw new ValidationError(
        'Deleting a single occurrence requires a synced calendar.',
      )
    }

    const original = new Date(data.occurrenceStart)
    const existing = await calendarEvents.findOverrideByOriginalStart(
      owner,
      master.externalId,
      original,
    )

    let override: CalendarEvent
    if (existing) {
      existing.update({ cancelled: true }, clock.now())
      override = existing
    } else {
      const duration = master.endsAt.getTime() - master.startsAt.getTime()
      override = CalendarEvent.create({
        id: ids.generate(),
        ownerId: owner,
        title: master.title,
        allDay: master.allDay,
        startsAt: original,
        endsAt: new Date(original.getTime() + duration),
        recurrenceMasterExternalId: master.externalId,
        originalStartsAt: original,
        cancelled: true,
        source: master.source,
        connectionId: master.connectionId,
        now: clock.now(),
      })
    }

    await calendarEvents.save(override)

    await jobQueue.enqueue({
      type: CALENDAR_PUSH_JOB,
      payload: { userId: ownerId, eventId: override.id as string },
      runAt: clock.now(),
    })
  }
}
