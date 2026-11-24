import {
  DEFAULT_TIME_ZONE,
  asEntityId,
  civilDate,
  civilTime,
  zonedWallTimeToInstant,
} from '@lifedeck/domain'
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
import type { UserRepository } from '@/ports/user-repository'
import { CALENDAR_PUSH_JOB } from '@/use-cases/calendar-sync-jobs'
import { ownerZoneFor, upcomingReminderJobs } from '@/shared/reminder-schedule'

type Dependencies = {
  calendarEvents: CalendarEventRepository
  users: Pick<UserRepository, 'findById'>
  jobQueue: JobQueue
  clock: Clock
}

export function makeUpdateCalendarEvent({
  calendarEvents,
  users,
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
      const owner = await users.findById(asEntityId(ownerId))
      const zone = event.allDay
        ? DEFAULT_TIME_ZONE
        : (owner?.timezone ?? DEFAULT_TIME_ZONE)
      const wall = civilTime(startsAt, zone)
      const duration = endsAt.getTime() - startsAt.getTime()
      startsAt = zonedWallTimeToInstant(
        civilDate(event.startsAt, zone),
        wall.hour,
        wall.minute,
        wall.second,
        zone,
      )
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

    // Re-arm reminders for the (possibly edited) offsets and times. Delivery
    // dedups per occurrence, so overlapping jobs never double-deliver.
    const ownerZone = await ownerZoneFor(users, event)
    for (const job of upcomingReminderJobs(event, clock.now(), ownerZone)) {
      await jobQueue.enqueue(job)
    }

    return toCalendarEventView(event)
  }
}
