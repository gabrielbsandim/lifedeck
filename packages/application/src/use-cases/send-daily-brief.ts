import {
  asEntityId,
  civilDate,
  toMessageLanguage,
  zonedIso,
} from '@lifedeck/domain'
import type { Clock } from '@/ports/clock'
import type { UserRepository } from '@/ports/user-repository'
import type { EntitlementService } from '@/ports/entitlement-service'
import type { WeatherProvider } from '@/ports/weather-provider'
import type { ProactiveSendGuard } from '@/ports/proactive-send-guard'
import type { makeSendProactiveMessage } from '@/shared/send-proactive-message'
import type { makeGetDailyBoard } from '@/use-cases/get-daily-board'
import type { makeListCalendarEvents } from '@/use-cases/list-calendar-events'
import { whatsappLanguageForLocale } from '@/shared/whatsapp-language'
import {
  composeDailyBrief,
  type DailyBriefWeather,
} from '@/shared/daily-brief-text'

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

    const text = composeDailyBrief(toMessageLanguage(user.locale), {
      dateLabel: formatBriefDate(now, user.locale, timezone),
      pendingTitles,
      doneCount,
      totalCount: board.tasks.length,
      carriedOver: board.carryOver.length,
      events: todayEvents,
      weather: weatherData,
    })

    const { delivered } = await sendProactiveMessage(userId, {
      text,
      template: briefTemplate?.name
        ? {
            name: briefTemplate.name,
            language: whatsappLanguageForLocale(
              user.locale,
              briefTemplate.language,
            ),
            params: [text],
          }
        : undefined,
    })

    return { sent: delivered }
  }
}
