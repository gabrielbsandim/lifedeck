import {
  asEntityId,
  civilDate,
  toMessageLanguage,
  zonedIso,
} from '@lifedeck/domain'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { UserRepository } from '@/ports/user-repository'
import type { EntitlementService } from '@/ports/entitlement-service'
import type { WeatherProvider } from '@/ports/weather-provider'
import type { ProactiveSendGuard } from '@/ports/proactive-send-guard'
import type { makePublishNotification } from '@/shared/publish-notification'
import type { makeSendProactiveMessage } from '@/shared/send-proactive-message'
import { pushTitles } from '@/shared/push-text'
import type { makeGetDailyBoard } from '@/use-cases/get-daily-board'
import type { makeListCalendarEvents } from '@/use-cases/list-calendar-events'
import { whatsappLanguageForLocale } from '@/shared/whatsapp-language'
import {
  composeDailyBrief,
  composeDailyBriefParam,
  type DailyBriefWeather,
} from '@/shared/daily-brief-text'
import { DAILY_BRIEF_JOB } from '@/use-cases/enqueue-daily-briefs'

const DAY_MS = 24 * 60 * 60 * 1000

export type BriefTemplate = {
  name: string
  language: string
}

type Dependencies = {
  users: UserRepository
  entitlements: EntitlementService
  getDailyBoard: ReturnType<typeof makeGetDailyBoard>
  listCalendarEvents: ReturnType<typeof makeListCalendarEvents>
  weather: WeatherProvider
  sendProactiveMessage: ReturnType<typeof makeSendProactiveMessage>
  sendGuard: ProactiveSendGuard
  publishNotification: ReturnType<typeof makePublishNotification>
  ids: IdGenerator
  clock: Clock
  briefTemplate?: BriefTemplate
}

// Localized short date, e.g. "Mon, Jul 20", in the user's zone.
function formatBriefDate(now: Date, locale: string, timezone: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: timezone,
  }).format(now)
}

export function makeSendDailyBrief({
  users,
  entitlements,
  getDailyBoard,
  listCalendarEvents,
  weather,
  sendProactiveMessage,
  sendGuard,
  publishNotification,
  ids,
  clock,
  briefTemplate,
}: Dependencies) {
  return async function sendDailyBrief(
    userId: string,
  ): Promise<{ sent: boolean }> {
    const user = await users.findById(asEntityId(userId))
    if (!user || !user.assistantProfile.briefEnabled) {
      return { sent: false }
    }

    // The daily brief is a proactive send: gate it on the plan entitlement so a
    // Free user who toggled it on in settings still does not get charged sends.
    const { entitlements: granted } = await entitlements.for(userId)
    if (!granted.includes('proactiveMessaging')) {
      return { sent: false }
    }

    const now = clock.now()
    const timezone = user.timezone
    const today = civilDate(now, timezone)

    // Hard backstop against a fan-out bug; a normal day trips this at most once.
    if (!(await sendGuard.tryConsume(userId, today))) {
      return { sent: false }
    }

    const board = await getDailyBoard(userId, today)
    const pendingTitles = board.tasks
      .filter(task => task.status === 'pending')
      .map(task => task.title)
    const doneCount = board.tasks.filter(
      task => task.status === 'completed',
    ).length

    // Today's events: a wide window around now, filtered to the user's civil day
    // and sorted, so the brief lists just today in local time.
    const events = await listCalendarEvents(userId, {
      from: new Date(now.getTime() - DAY_MS).toISOString(),
      to: new Date(now.getTime() + DAY_MS).toISOString(),
    })
    const todayEvents = events
      .filter(event => civilDate(new Date(event.startsAt), timezone) === today)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .map(event => ({
        time: zonedIso(new Date(event.startsAt), timezone).slice(11, 16),
        title: event.title,
      }))

    // Weather for the saved home place, best-effort: a lookup failure just drops
    // the weather line rather than the whole brief.
    let weatherData: DailyBriefWeather | null = null
    const home = user.assistantProfile.homeLocation
    if (home) {
      const lookup = await weather.getForecast({
        location: home,
        from: today,
        to: today,
      })
      if (lookup.ok && lookup.forecast.days[0]) {
        const day = lookup.forecast.days[0]
        weatherData = {
          location: lookup.forecast.location,
          tempMinC: day.tempMinC,
          tempMaxC: day.tempMaxC,
          precipitationProbabilityPct: day.precipitationProbabilityPct,
        }
      }
    }

    const language = toMessageLanguage(user.locale)
    const briefData = {
      dateLabel: formatBriefDate(now, user.locale, timezone),
      pendingTitles,
      doneCount,
      totalCount: board.tasks.length,
      carriedOver: board.carryOver.length,
      events: todayEvents,
      weather: weatherData,
    }
    const text = composeDailyBrief(language, briefData)

    const { delivered } = await sendProactiveMessage(userId, {
      text,
      template: briefTemplate?.name
        ? {
            name: briefTemplate.name,
            language: whatsappLanguageForLocale(
              user.locale,
              briefTemplate.language,
            ),
            // A template body param must be a single line, so the fallback send
            // carries the compact version, not the full bulleted brief.
            params: [composeDailyBriefParam(language, briefData)],
          }
        : undefined,
    })

    // WhatsApp is best-effort: outside the 24h window, with no approved template
    // configured, the send is skipped and the brief would simply vanish. Keep it
    // in the app's notification bell so the day's summary is never lost, the way
    // reminders already do. Only on failure, so a delivered brief is not echoed.
    if (!delivered) {
      await publishNotification({
        id: ids.generate(),
        userId: asEntityId(userId),
        type: DAILY_BRIEF_JOB,
        data: { date: today, text },
        createdAt: now,
        alert: { title: pushTitles(language).brief, body: text },
      })
    }

    return { sent: delivered }
  }
}
