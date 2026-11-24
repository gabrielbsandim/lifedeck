import {
  DEFAULT_TIME_ZONE,
  recurringInstantsBetween,
  type CalendarEvent,
} from '@lifedeck/domain'
import type { EnqueueJobInput } from '@/ports/job-queue'
import type { UserRepository } from '@/ports/user-repository'
import { MINUTE_MS, REMINDER_JOB } from '@/use-cases/reminder-jobs'

const LOOKAHEAD_MS = 400 * 24 * 60 * MINUTE_MS

// Only a recurring series needs the owner's zone, so a single event skips the
// user lookup.
export async function ownerZoneFor(
  users: Pick<UserRepository, 'findById'>,
  event: CalendarEvent,
): Promise<string> {
  if (!event.recurrence) {
    return DEFAULT_TIME_ZONE
  }
  const owner = await users.findById(event.ownerId)
  return owner?.timezone ?? DEFAULT_TIME_ZONE
}

function seriesZone(event: CalendarEvent, ownerZone: string): string {
  return event.allDay ? DEFAULT_TIME_ZONE : ownerZone
}

// The first occurrence of a recurring event that starts strictly after
// `after`, or null once the series has ended.
export function nextOccurrenceStart(
  event: CalendarEvent,
  after: Date,
  ownerZone: string,
): Date | null {
  const rule = event.recurrence
  if (!rule) {
    return event.startsAt.getTime() > after.getTime() ? event.startsAt : null
  }
  const props = event.toJSON()
  const instants = recurringInstantsBetween({
    rule,
    firstStartsAt: props.startsAt,
    durationMs: props.endsAt.getTime() - props.startsAt.getTime(),
    from: after,
    to: new Date(after.getTime() + LOOKAHEAD_MS),
    timeZone: seriesZone(event, ownerZone),
  })
  const next = instants.find(
    instant => instant.startsAt.getTime() > after.getTime(),
  )
  return next?.startsAt ?? null
}

export function isOccurrenceOf(
  event: CalendarEvent,
  startsAt: Date,
  ownerZone: string,
): boolean {
  const rule = event.recurrence
  if (!rule) {
    return event.startsAt.getTime() === startsAt.getTime()
  }
  const props = event.toJSON()
  return recurringInstantsBetween({
    rule,
    firstStartsAt: props.startsAt,
    durationMs: props.endsAt.getTime() - props.startsAt.getTime(),
    from: startsAt,
    to: startsAt,
    timeZone: seriesZone(event, ownerZone),
  }).some(instant => instant.startsAt.getTime() === startsAt.getTime())
}

export function reminderJob(
  event: CalendarEvent,
  minutesBefore: number,
  occurrenceStart: Date,
): EnqueueJobInput {
  return {
    type: REMINDER_JOB,
    payload: {
      eventId: event.id as string,
      userId: event.ownerId as string,
      minutesBefore,
      ...(event.recurrence
        ? { occurrenceStart: occurrenceStart.toISOString() }
        : {}),
    },
    runAt: new Date(occurrenceStart.getTime() - minutesBefore * MINUTE_MS),
  }
}

// One job per reminder offset, aimed at the next occurrence whose reminder is
// still ahead. A recurring series re-arms itself on delivery, so only the next
// firing is ever queued.
export function upcomingReminderJobs(
  event: CalendarEvent,
  now: Date,
  ownerZone: string,
): EnqueueJobInput[] {
  if (event.cancelled) {
    return []
  }
  const jobs: EnqueueJobInput[] = []
  for (const minutesBefore of event.reminders) {
    const earliestStart = new Date(now.getTime() + minutesBefore * MINUTE_MS)
    const occurrence = nextOccurrenceStart(event, earliestStart, ownerZone)
    if (occurrence) {
      jobs.push(reminderJob(event, minutesBefore, occurrence))
    }
  }
  return jobs
}
