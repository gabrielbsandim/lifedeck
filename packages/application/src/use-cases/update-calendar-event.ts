import { asEntityId } from '@lifedeck/domain'
import {
  updateCalendarEventSchema,
  type CalendarEventView,
  type UpdateCalendarEventInput,
} from '@/dtos/calendar-event-dto'
import { toCalendarEventView } from '@/mappers/calendar-event-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { CalendarEventRepository } from '@/ports/calendar-event-repository'
import type { JobQueue } from '@/ports/job-queue'
import { CALENDAR_PUSH_JOB } from '@/use-cases/calendar-sync-jobs'

type Dependencies = {
  calendarEvents: CalendarEventRepository
  jobQueue: JobQueue
  clock: Clock
}

export function makeUpdateCalendarEvent({
  calendarEvents,
  jobQueue,
  clock,
}: Dependencies) {
  return async function updateCalendarEvent(
    ownerId: string,
    id: string,
    input: UpdateCalendarEventInput,
  ): Promise<CalendarEventView> {
    const data = updateCalendarEventSchema.parse(input)

    const event = await calendarEvents.findById(asEntityId(id))
    if (!event || !event.isOwnedBy(asEntityId(ownerId))) {
      throw new NotFoundError('Calendar event')
    }

    event.update(
      {
        title: data.title,
        description: data.description,
        location: data.location,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
        allDay: data.allDay,
        reminders: data.reminders,
        recurrence: data.recurrence,
      },
      clock.now(),
    )

    await calendarEvents.save(event)

    await jobQueue.enqueue({
      type: CALENDAR_PUSH_JOB,
      payload: { userId: ownerId, eventId: event.id as string },
      runAt: clock.now(),
    })

    return toCalendarEventView(event)
  }
}
