import { CalendarEvent, ValidationError, asEntityId } from '@lifedeck/domain'
import {
  updateCalendarOccurrenceSchema,
  type CalendarEventView,
  type UpdateCalendarOccurrenceInput,
} from '@/dtos/calendar-event-dto'
import { toCalendarEventView } from '@/mappers/calendar-event-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { CalendarEventRepository } from '@/ports/calendar-event-repository'
import type { JobQueue } from '@/ports/job-queue'
import { CALENDAR_PUSH_JOB } from '@/use-cases/calendar-sync-jobs'
import { MINUTE_MS, REMINDER_JOB } from '@/use-cases/reminder-jobs'

type Dependencies = {
  calendarEvents: CalendarEventRepository
  jobQueue: JobQueue
  ids: IdGenerator
  clock: Clock
}

// Edits a single occurrence of a recurring series ("this event only") by
// creating or updating an override row pinned to the occurrence's original
// start, then pushing that instance to the provider.
export function makeUpdateCalendarOccurrence({
  calendarEvents,
  jobQueue,
  ids,
  clock,
}: Dependencies) {
  return async function updateCalendarOccurrence(
    ownerId: string,
    seriesId: string,
    input: UpdateCalendarOccurrenceInput,
  ): Promise<CalendarEventView> {
    const data = updateCalendarOccurrenceSchema.parse(input)
    const owner = asEntityId(ownerId)

    const master = await calendarEvents.findById(asEntityId(seriesId))
    if (!master || !master.isOwnedBy(owner) || !master.recurrence) {
      throw new NotFoundError('Calendar event')
    }
    if (!master.externalId) {
      throw new ValidationError(
        'Editing a single occurrence requires a synced calendar.',
      )
    }

    const occurrenceStart = new Date(data.occurrenceStart)
    const startsAt = new Date(data.startsAt)
    const endsAt = new Date(data.endsAt)

    const existing = await calendarEvents.findOverrideByOriginalStart(
      owner,
      master.externalId,
      occurrenceStart,
    )

    let override: CalendarEvent
    if (existing) {
      existing.update(
        {
          title: data.title,
          description: data.description,
          location: data.location,
          startsAt,
          endsAt,
          allDay: data.allDay,
          reminders: data.reminders,
          cancelled: false,
        },
        clock.now(),
      )
      override = existing
    } else {
      override = CalendarEvent.create({
        id: ids.generate(),
        ownerId: owner,
        title: data.title,
        description: data.description,
        location: data.location,
        startsAt,
        endsAt,
        allDay: data.allDay,
        reminders: data.reminders,
        recurrenceMasterExternalId: master.externalId,
        originalStartsAt: occurrenceStart,
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

    const startsAtMs = override.startsAt.getTime()
    for (const minutesBefore of override.reminders) {
      const fireAt = startsAtMs - minutesBefore * MINUTE_MS
      if (fireAt > clock.now().getTime()) {
        await jobQueue.enqueue({
          type: REMINDER_JOB,
          payload: {
            eventId: override.id as string,
            userId: ownerId,
            minutesBefore,
          },
          runAt: new Date(fireAt),
        })
      }
    }

    return toCalendarEventView(override)
  }
}
