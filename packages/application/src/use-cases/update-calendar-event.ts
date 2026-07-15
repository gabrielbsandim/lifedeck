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
import { MINUTE_MS, REMINDER_JOB } from '@/use-cases/reminder-jobs'

function utcMidnightMs(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

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

    let startsAt = data.startsAt ? new Date(data.startsAt) : undefined
    let endsAt = data.endsAt ? new Date(data.endsAt) : undefined
    // Editing a recurring series from one of its occurrences ("all events"):
    // the incoming times belong to that occurrence's day. Keep the series'
    // recurrence anchor (its own date) and only shift the time-of-day and
    // duration, so the whole series moves in time without changing which days
    // it lands on.
    if (event.recurrence && startsAt && endsAt) {
      const anchor = utcMidnightMs(event.startsAt)
      const timeOfDay = startsAt.getTime() - utcMidnightMs(startsAt)
      const duration = endsAt.getTime() - startsAt.getTime()
      startsAt = new Date(anchor + timeOfDay)
      endsAt = new Date(startsAt.getTime() + duration)
    }

    event.update(
      {
        title: data.title,
        description: data.description,
        location: data.location,
        startsAt,
        endsAt,
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

    // Re-arm reminders for the (possibly edited) offsets and times. The handler
    // dedups against already-delivered notifications, so the overlap with jobs
    // armed at create time never double-delivers.
    const reminderAnchor = event.startsAt.getTime()
    for (const minutesBefore of event.reminders) {
      const fireAt = reminderAnchor - minutesBefore * MINUTE_MS
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
