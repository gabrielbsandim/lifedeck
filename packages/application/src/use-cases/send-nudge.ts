import {
  asEntityId,
  civilDate,
  civilHour,
  toMessageLanguage,
} from '@lifedeck/domain'
import type { AssistantProfile } from '@lifedeck/domain'
import type { Clock } from '@/ports/clock'
import type { ConversationStore } from '@/ports/conversation-store'
import type { EntitlementService } from '@/ports/entitlement-service'
import type { IdGenerator } from '@/ports/id-generator'
import type { UserRepository } from '@/ports/user-repository'
import type { NudgeLogRepository } from '@/ports/nudge-log-repository'
import type { ProactiveSendGuard } from '@/ports/proactive-send-guard'
import type { makeSendProactiveMessage } from '@/shared/send-proactive-message'
import type { makeGetDailyBoard } from '@/use-cases/get-daily-board'
import { whatsappLanguageForLocale } from '@/shared/whatsapp-language'
import { composeNudge, nudgeButtonLabels } from '@/shared/nudge-text'

const DAY_MS = 86_400_000
// A pending task carried this many civil days is stale enough to nudge about.
const CARRIED_DAYS_THRESHOLD = 3
// Don't nudge about the same task again within this many days.
const NUDGE_COOLDOWN_DAYS = 3

export type NudgeTemplate = {
  name: string
  language: string
}

type Dependencies = {
  users: Pick<UserRepository, 'findById'>
  entitlements: EntitlementService
  getDailyBoard: ReturnType<typeof makeGetDailyBoard>
  nudgeLogs: NudgeLogRepository
  sendProactiveMessage: ReturnType<typeof makeSendProactiveMessage>
  sendGuard: ProactiveSendGuard
  // Records the nudge as an assistant turn so a "Yes, reschedule" reply (tapped
  // button or typed) reaches the assistant with the task already in context.
  conversations: Pick<ConversationStore, 'append'>
  ids: IdGenerator
  clock: Clock
  nudgeTemplate?: NudgeTemplate
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) /
      DAY_MS,
  )
}

// Whether `hour` falls in the user's quiet window, handling a window that wraps
// past midnight (e.g. 22-7) as well as a same-day one (e.g. 0-7).
function inQuietHours(profile: AssistantProfile, hour: number): boolean {
  const start = profile.quietHoursStart
  const end = profile.quietHoursEnd
  if (start === null || end === null || start === end) {
    return false
  }
  return start < end ? hour >= start && hour < end : hour >= start || hour < end
}

export function makeSendNudge({
  users,
  entitlements,
  getDailyBoard,
  nudgeLogs,
  sendProactiveMessage,
  sendGuard,
  conversations,
  ids,
  clock,
  nudgeTemplate,
}: Dependencies) {
  return async function sendNudge(userId: string): Promise<{ sent: boolean }> {
    const user = await users.findById(asEntityId(userId))
    if (!user) {
      return { sent: false }
    }

    // Nudges anchor Premium; the plan tier is the gate (no dedicated entitlement).
    const { plan } = await entitlements.for(userId)
    if (plan !== 'premium') {
      return { sent: false }
    }

    const profile = user.assistantProfile
    if (!profile.nudgesEnabled) {
      return { sent: false }
    }

    const now = clock.now()
    const timezone = user.timezone
    if (inQuietHours(profile, civilHour(now, timezone))) {
      return { sent: false }
    }

    const today = civilDate(now, timezone)
    // At most one nudge per user per day.
    if (await nudgeLogs.hasSentOn(asEntityId(userId), today)) {
      return { sent: false }
    }

    // Rule: the pending task that has been carried onto today's board longest,
    // once it has lingered past the threshold.
    const board = await getDailyBoard(userId, today)
    const stale = board.tasks
      .filter(
        task => task.status === 'pending' && task.carriedFromDate !== null,
      )
      .map(task => ({
        task,
        days: daysBetween(task.carriedFromDate as string, today),
      }))
      .filter(entry => entry.days >= CARRIED_DAYS_THRESHOLD)
      .sort((a, b) => b.days - a.days)
    const candidate = stale[0]
    if (!candidate) {
      return { sent: false }
    }

    // Per-target cooldown so we don't nag about the same task every few days.
    const key = `carried_task:${candidate.task.id}`
    const lastSent = await nudgeLogs.lastSentDate(asEntityId(userId), key)
    if (
      lastSent !== null &&
      daysBetween(lastSent, today) < NUDGE_COOLDOWN_DAYS
    ) {
      return { sent: false }
    }

    // Hard backstop shared with the brief/check-in against a fan-out bug.
    if (!(await sendGuard.tryConsume(userId, today))) {
      return { sent: false }
    }

    const language = toMessageLanguage(user.locale)
    const text = composeNudge(language, {
      taskTitle: candidate.task.title,
      days: candidate.days,
    })
    const labels = nudgeButtonLabels(language)
    const { delivered } = await sendProactiveMessage(userId, {
      text,
      buttons: [
        { id: `nudge_yes:${candidate.task.id}`, title: labels.yes },
        { id: `nudge_no:${candidate.task.id}`, title: labels.no },
      ],
      template: nudgeTemplate?.name
        ? {
            name: nudgeTemplate.name,
            language: whatsappLanguageForLocale(
              user.locale,
              nudgeTemplate.language,
            ),
            params: [text],
          }
        : undefined,
    })

    if (delivered) {
      await nudgeLogs.record({
        id: ids.generate(),
        userId: asEntityId(userId),
        key,
        date: today,
        createdAt: now,
      })
      // Best-effort: the reply context is a nicety, not worth failing the send.
      try {
        await conversations.append(userId, [
          { role: 'assistant', content: text },
        ])
      } catch {
        // Ignore; the nudge already went out and a reply still reaches the
        // assistant, just without this pre-seeded context.
      }
    }

    return { sent: delivered }
  }
}
