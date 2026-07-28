import {
  asEntityId,
  civilDate,
  isHabitScheduledOn,
  toMessageLanguage,
} from '@lifedeck/domain'
import type { Clock } from '@/ports/clock'
import type { EntitlementService } from '@/ports/entitlement-service'
import type { HabitRepository } from '@/ports/habit-repository'
import type { HabitLogRepository } from '@/ports/habit-log-repository'
import type { IdGenerator } from '@/ports/id-generator'
import type { UserRepository } from '@/ports/user-repository'
import type { ProactiveSendGuard } from '@/ports/proactive-send-guard'
import type { makePublishNotification } from '@/shared/publish-notification'
import type { makeSendProactiveMessage } from '@/shared/send-proactive-message'
import { pushTitles } from '@/shared/push-text'
import { whatsappLanguageForLocale } from '@/shared/whatsapp-language'
import { composeHabitCheckin } from '@/shared/habit-checkin-text'
import { HABIT_CHECKIN_JOB } from '@/use-cases/enqueue-habit-checkins'

export type CheckinTemplate = {
  name: string
  language: string
}

type Dependencies = {
  habits: HabitRepository
  habitLogs: HabitLogRepository
  users: Pick<UserRepository, 'findById'>
  entitlements: EntitlementService
  sendProactiveMessage: ReturnType<typeof makeSendProactiveMessage>
  sendGuard: ProactiveSendGuard
  publishNotification: ReturnType<typeof makePublishNotification>
  ids: IdGenerator
  clock: Clock
  checkinTemplate?: CheckinTemplate
}

export function makeSendHabitCheckin({
  habits,
  habitLogs,
  users,
  entitlements,
  sendProactiveMessage,
  sendGuard,
  publishNotification,
  ids,
  clock,
  checkinTemplate,
}: Dependencies) {
  return async function sendHabitCheckin(
    userId: string,
    habitId: string,
  ): Promise<{ sent: boolean }> {
    const habit = await habits.findById(asEntityId(habitId))
    if (
      !habit ||
      !habit.isOwnedBy(asEntityId(userId)) ||
      !habit.active ||
      habit.checkinHour === null
    ) {
      return { sent: false }
    }

    // A proactive send: gate on the plan entitlement so a habit's check-in never
    // charges a Free user, even if one somehow got a check-in hour set.
    const { entitlements: granted } = await entitlements.for(userId)
    if (!granted.includes('proactiveMessaging')) {
      return { sent: false }
    }

    const user = await users.findById(asEntityId(userId))
    if (!user) {
      return { sent: false }
    }
    const today = civilDate(clock.now(), user.timezone)

    // Skip a day the habit isn't scheduled, and skip if it's already logged, so
    // we never nag about something the user already did.
    if (!isHabitScheduledOn(habit.cadence, today)) {
      return { sent: false }
    }
    if (await habitLogs.findByHabitAndDate(asEntityId(habitId), today)) {
      return { sent: false }
    }

    // Hard backstop shared with the brief against a fan-out bug.
    if (!(await sendGuard.tryConsume(userId, today))) {
      return { sent: false }
    }

    const language = toMessageLanguage(user.locale)
    const text = composeHabitCheckin(language, habit.title)
    const { delivered } = await sendProactiveMessage(userId, {
      text,
      template: checkinTemplate?.name
        ? {
            name: checkinTemplate.name,
            language: whatsappLanguageForLocale(
              user.locale,
              checkinTemplate.language,
            ),
            // The approved habit_checkin template takes the habit title as its
            // single body param.
            params: [habit.title],
          }
        : undefined,
    })

    // Same fallback as the daily brief: a closed WhatsApp window must not make
    // the check-in disappear, so it lands in the in-app notification bell.
    if (!delivered) {
      await publishNotification({
        id: ids.generate(),
        userId: asEntityId(userId),
        type: HABIT_CHECKIN_JOB,
        data: { habitId: habitId, habitTitle: habit.title, text },
        createdAt: clock.now(),
        alert: { title: pushTitles(language).checkin, body: text },
      })
    }

    return { sent: delivered }
  }
}
