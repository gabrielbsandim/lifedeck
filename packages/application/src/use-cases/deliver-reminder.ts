import { Notification, asEntityId, toMessageLanguage } from '@lifedeck/domain'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { CalendarEventRepository } from '@/ports/calendar-event-repository'
import { toEmailLocale, type EmailSender } from '@/ports/email-sender'
import { formatEventTime } from '@/shared/format-event-time'
import { whatsappLanguageForLocale } from '@/shared/whatsapp-language'
import { whatsappReminderText } from '@/shared/whatsapp-reminder-text'
import type { makeSendProactiveMessage } from '@/shared/send-proactive-message'
import type { NotificationRepository } from '@/ports/notification-repository'
import type { UserRepository } from '@/ports/user-repository'
import type { JobQueue } from '@/ports/job-queue'
import { MINUTE_MS, REMINDER_JOB } from '@/use-cases/reminder-jobs'

export type ReminderTemplate = {
  name: string
  language: string
}

type Dependencies = {
  calendarEvents: CalendarEventRepository
  notifications: NotificationRepository
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
  users,
  emailSender,
  sendProactiveMessage,
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
    const alreadyDelivered = await notifications.hasReminder(
      asEntityId(userId),
      eventId,
      String(minutesBefore),
    )
    if (alreadyDelivered) {
      return { delivered: false }
    }

    // In-app notification always fires; it is the reliable channel.
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

    const user = await users.findById(asEntityId(userId))
    const startsAtIso = props.startsAt.toISOString()

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
      // A localized, timezone-aware time rather than a raw ISO timestamp; both
      // the free-form text and the template render it as-is.
      const when = user
        ? formatEventTime(
            startsAtIso,
            toEmailLocale(user.locale),
            user.timezone,
          )
        : startsAtIso
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

    return { delivered: true }
  }
}
