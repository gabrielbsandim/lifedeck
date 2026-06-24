import { Notification, asEntityId } from '@lifedeck/domain'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { CalendarEventRepository } from '@/ports/calendar-event-repository'
import type { NotificationRepository } from '@/ports/notification-repository'
import type { JobQueue } from '@/ports/job-queue'
import { MINUTE_MS, REMINDER_JOB } from '@/use-cases/reminder-jobs'

type Dependencies = {
  calendarEvents: CalendarEventRepository
  notifications: NotificationRepository
  jobQueue: JobQueue
  ids: IdGenerator
  clock: Clock
}

export type ReminderResult = {
  delivered: boolean
  rescheduled?: boolean
}

export function makeDeliverReminder({
  calendarEvents,
  notifications,
  jobQueue,
  ids,
  clock,
}: Dependencies) {
  return async function deliverReminder(
    eventId: string,
    userId: string,
    minutesBefore: number,
  ): Promise<ReminderResult> {
    const event = await calendarEvents.findById(asEntityId(eventId))
    // The event was deleted, or this reminder offset was removed: drop it.
    if (!event || !event.reminders.includes(minutesBefore)) {
      return { delivered: false }
    }

    const props = event.toJSON()
    const fireAt = props.startsAt.getTime() - minutesBefore * MINUTE_MS
    const now = clock.now().getTime()

    // The event was moved later: re-arm the reminder for its new time.
    if (now < fireAt - MINUTE_MS) {
      await jobQueue.enqueue({
        type: REMINDER_JOB,
        payload: { eventId, userId, minutesBefore },
        runAt: new Date(fireAt),
      })
      return { delivered: false, rescheduled: true }
    }

    // The event has already started: a late reminder is noise, skip it.
    if (now > props.startsAt.getTime()) {
      return { delivered: false }
    }

    await notifications.save(
      Notification.create({
        id: ids.generate(),
        userId: asEntityId(userId),
        type: REMINDER_JOB,
        data: {
          eventId,
          title: props.title,
          startsAt: props.startsAt.toISOString(),
          minutesBefore: String(minutesBefore),
        },
        createdAt: clock.now(),
      }),
    )
    return { delivered: true }
  }
}
