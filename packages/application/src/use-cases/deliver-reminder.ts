import {
  DEFAULT_TIME_ZONE,
  asEntityId,
  toMessageLanguage,
  type CalendarEvent,
} from '@lifedeck/domain'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { CalendarEventRepository } from '@/ports/calendar-event-repository'
import { toEmailLocale, type EmailSender } from '@/ports/email-sender'
import { formatEventTime } from '@/shared/format-event-time'
import { whatsappLanguageForLocale } from '@/shared/whatsapp-language'
import { whatsappReminderText } from '@/shared/whatsapp-reminder-text'
import type { makePublishNotification } from '@/shared/publish-notification'
import { pushTitles, reminderPushBody } from '@/shared/push-text'
import type { makeSendProactiveMessage } from '@/shared/send-proactive-message'
import type { NotificationRepository } from '@/ports/notification-repository'
import type { UserRepository } from '@/ports/user-repository'
import type { JobQueue } from '@/ports/job-queue'
import { MINUTE_MS, REMINDER_JOB } from '@/use-cases/reminder-jobs'
import {
  isOccurrenceOf,
  nextOccurrenceStart,
  reminderJob,
} from '@/shared/reminder-schedule'

export type ReminderTemplate = {
  name: string
  language: string
}

type Dependencies = {
  calendarEvents: CalendarEventRepository
  notifications: NotificationRepository
  publishNotification: ReturnType<typeof makePublishNotification>
  users: UserRepository
  emailSender: EmailSender
  sendProactiveMessage: ReturnType<typeof makeSendProactiveMessage>
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
  publishNotification,
  users,
  emailSender,
  sendProactiveMessage,
  jobQueue,
  ids,
  clock,
  reminderTemplate,
}: Dependencies) {
  // A series re-arms itself: once one occurrence is handled, queue the next.
  async function armNextOccurrence(
    event: CalendarEvent,
    minutesBefore: number,
    after: Date,
    ownerZone: string,
  ): Promise<void> {
    if (!event.recurrence) {
      return
    }
    const earliest = Math.max(
      after.getTime(),
      clock.now().getTime() + minutesBefore * MINUTE_MS,
    )
    const next = nextOccurrenceStart(event, new Date(earliest), ownerZone)
    if (next) {
      await jobQueue.enqueue(reminderJob(event, minutesBefore, next))
    }
  }

  // An edited or cancelled occurrence is stored as its own row with its own
  // reminder jobs, so the series must stay quiet for that slot.
  async function hasOverride(
    event: CalendarEvent,
    occurrence: Date,
  ): Promise<boolean> {
    if (!event.recurrence || !event.externalId) {
      return false
    }
    const overrides = await calendarEvents.listOverridesByMasterExternalIds(
      event.ownerId,
      [event.externalId],
    )
    return overrides.some(
      override => override.originalStartsAt?.getTime() === occurrence.getTime(),
    )
  }

  return async function deliverReminder(
    eventId: string,
    userId: string,
    minutesBefore: number,
    occurrenceStart?: string,
  ): Promise<ReminderResult> {
    const event = await calendarEvents.findById(asEntityId(eventId))
    // The event was deleted, or this reminder offset was removed: drop it.
    if (!event || !event.reminders.includes(minutesBefore)) {
      return { delivered: false }
    }

    const props = event.toJSON()
    // Loaded before publishing rather than after: the push alert carries a time
    // formatted in the user's locale and timezone, so their preferences have to
    // be known by then.
    const user = await users.findById(asEntityId(userId))
    const ownerZone = user?.timezone ?? DEFAULT_TIME_ZONE
    const occurrence = occurrenceStart
      ? new Date(occurrenceStart)
      : props.startsAt
    const now = clock.now().getTime()

    // The series was edited and this slot is no longer one of its occurrences.
    if (event.recurrence && !isOccurrenceOf(event, occurrence, ownerZone)) {
      await armNextOccurrence(event, minutesBefore, clock.now(), ownerZone)
      return { delivered: false, rescheduled: true }
    }

    const fireAt = occurrence.getTime() - minutesBefore * MINUTE_MS
    // The event was moved later: re-arm the reminder for its new time.
    if (!event.recurrence && now < fireAt - MINUTE_MS) {
      await jobQueue.enqueue(reminderJob(event, minutesBefore, occurrence))
      return { delivered: false, rescheduled: true }
    }

    // The occurrence has already started: a late reminder is noise, skip it.
    if (now > occurrence.getTime()) {
      await armNextOccurrence(event, minutesBefore, occurrence, ownerZone)
      return { delivered: false }
    }

    if (await hasOverride(event, occurrence)) {
      await armNextOccurrence(event, minutesBefore, occurrence, ownerZone)
      return { delivered: false }
    }

    const startsAtIso = occurrence.toISOString()
    // An edit can leave more than one job for the same offset; deliver once.
    const alreadyDelivered = await notifications.hasReminder(
      asEntityId(userId),
      eventId,
      String(minutesBefore),
      startsAtIso,
    )
    if (alreadyDelivered) {
      return { delivered: false }
    }

    // A localized, timezone-aware time rather than a raw ISO timestamp; the push
    // alert, the free-form WhatsApp text and the template all render it as-is.
    const when = user
      ? formatEventTime(startsAtIso, toEmailLocale(user.locale), user.timezone)
      : startsAtIso

    // In-app notification always fires; it is the reliable channel. Push mirrors
    // it for anyone who installed the app and allowed notifications.
    await publishNotification({
      id: ids.generate(),
      userId: asEntityId(userId),
      type: REMINDER_JOB,
      data: {
        eventId,
        title: props.title,
        startsAt: startsAtIso,
        minutesBefore: String(minutesBefore),
      },
      createdAt: clock.now(),
      alert: {
        title: pushTitles(toMessageLanguage(user?.locale)).reminder,
        body: reminderPushBody(props.title, when),
      },
    })

    // Best-effort email reminder, opt-in per user and only to a verified address.
    // A failure must not undo the in-app notification, so it is swallowed.
    if (user?.reminderEmail && user.email && user.isEmailVerified) {
      try {
        await emailSender.sendEventReminder(
          user.email,
          props.title,
          startsAtIso,
          toEmailLocale(user.locale),
          user.timezone,
        )
      } catch {
        // Ignore; the in-app notification already landed.
      }
    }

    // Best-effort proactive WhatsApp alert when the user opted in and linked a
    // verified number. The shared sender picks a free-form text while WhatsApp's
    // 24h window is open and falls back to the approved template once it closes;
    // with neither available, only the in-app notification fires.
    if (user?.reminderWhatsapp !== false) {
      await sendProactiveMessage(userId, {
        text: whatsappReminderText(
          toMessageLanguage(user?.locale),
          props.title,
          when,
        ),
        template: reminderTemplate?.name
          ? {
              name: reminderTemplate.name,
              // Render in the recipient's language, not one global default.
              language: whatsappLanguageForLocale(
                user?.locale,
                reminderTemplate.language,
              ),
              params: [props.title, when],
            }
          : undefined,
      })
    }

    await armNextOccurrence(event, minutesBefore, occurrence, ownerZone)
    return { delivered: true }
  }
}
