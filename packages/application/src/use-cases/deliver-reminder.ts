import { Notification, asEntityId } from '@lifedeck/domain'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { CalendarEventRepository } from '@/ports/calendar-event-repository'
import type { ChannelIdentityRepository } from '@/ports/channel-identity-repository'
import type { MessagingChannel } from '@/ports/messaging-channel'
import type { NotificationRepository } from '@/ports/notification-repository'
import type { JobQueue } from '@/ports/job-queue'
import { MINUTE_MS, REMINDER_JOB } from '@/use-cases/reminder-jobs'

export type ReminderTemplate = {
  name: string
  language: string
}

const DEDUP_SCAN_LIMIT = 50

type Dependencies = {
  calendarEvents: CalendarEventRepository
  notifications: NotificationRepository
  channelIdentities: ChannelIdentityRepository
  messaging: MessagingChannel
  jobQueue: JobQueue
  ids: IdGenerator
  clock: Clock
  reminderTemplate?: ReminderTemplate
}

export type ReminderResult = {
  delivered: boolean
  rescheduled?: boolean
}

export function makeDeliverReminder({
  calendarEvents,
  notifications,
  channelIdentities,
  messaging,
  jobQueue,
  ids,
  clock,
  reminderTemplate,
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

    // An edit can leave more than one job for the same offset; deliver once.
    const recent = await notifications.listByUser(
      asEntityId(userId),
      DEDUP_SCAN_LIMIT,
    )
    const alreadyDelivered = recent.some(notification => {
      const stored = notification.toJSON()
      return (
        stored.type === REMINDER_JOB &&
        stored.data.eventId === eventId &&
        stored.data.minutesBefore === String(minutesBefore)
      )
    })
    if (alreadyDelivered) {
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

    // Best-effort proactive WhatsApp alert when the user linked a number and a
    // utility template is configured. A failure here must not undo the in-app
    // notification, so it is swallowed.
    if (reminderTemplate?.name) {
      const identity = await channelIdentities.findByUser(
        asEntityId(userId),
        'whatsapp',
      )
      if (identity?.isVerified() && identity.address) {
        try {
          await messaging.sendTemplate(identity.address, {
            name: reminderTemplate.name,
            language: reminderTemplate.language,
            params: [props.title, props.startsAt.toISOString()],
          })
        } catch {
          // Ignore; the in-app notification already landed.
        }
      }
    }

    return { delivered: true }
  }
}
