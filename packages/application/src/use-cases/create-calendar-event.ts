import { CalendarEvent, asEntityId } from '@lifedeck/domain'
import {
  createCalendarEventSchema,
  type CalendarEventView,
  type CreateCalendarEventInput,
} from '@/dtos/calendar-event-dto'
import { toCalendarEventView } from '@/mappers/calendar-event-mapper'
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

export function makeCreateCalendarEvent({
  calendarEvents,
  jobQueue,
  ids,
  clock,
}: Dependencies) {
  return async function createCalendarEvent(
    ownerId: string,
    input: CreateCalendarEventInput,
  ): Promise<CalendarEventView> {
    const data = createCalendarEventSchema.parse(input)

    const event = CalendarEvent.create({
      id: ids.generate(),
      ownerId: asEntityId(ownerId),
      title: data.title,
      description: data.description,
      location: data.location,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
      allDay: data.allDay,
      reminders: data.reminders,
      recurrence: data.recurrence ?? null,
      now: clock.now(),
    })

    await calendarEvents.save(event)

    // Outbound sync is best-effort and handled off the request path; the push
    // worker is a no-op when the user has no calendar connection.
    await jobQueue.enqueue({
      type: CALENDAR_PUSH_JOB,
      payload: { userId: ownerId, eventId: event.id as string },
      runAt: clock.now(),
    })

    // Arm a reminder job for each offset whose fire time is still in the future.
    const startsAt = event.startsAt.getTime()
    for (const minutesBefore of event.reminders) {
      const fireAt = startsAt - minutesBefore * MINUTE_MS
      if (fireAt > clock.now().getTime()) {
        await jobQueue.enqueue({
          type: REMINDER_JOB,
          payload: {
            eventId: event.id as string,
            userId: ownerId,
            minutesBefore,
          },
          runAt: new Date(fireAt),
        })
      }
    }

    return toCalendarEventView(event)
  }
}
