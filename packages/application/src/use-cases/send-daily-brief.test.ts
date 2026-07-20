import { describe, expect, it, vi } from 'vitest'
import { User, type Entitlement } from '@lifedeck/domain'
import { makeSendDailyBrief } from '@/use-cases/send-daily-brief'
import type { DailyBoardView } from '@/use-cases/get-daily-board'
import type { CalendarEventView } from '@/dtos/calendar-event-dto'
import type { WeatherLookup } from '@/ports/weather-provider'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { InMemoryProactiveSendGuard } from '@/testing/in-memory-proactive-send-guard'
import { FixedClock, ID } from '@/testing/fakes'

// 12:00 UTC; the user sits in UTC so "today" is 2026-06-22 there.
const NOW = new Date('2026-06-22T12:00:00.000Z')

function board(
  tasks: Array<{ status: string; title: string }>,
  carryOver = 0,
): DailyBoardView {
  return {
    list: { id: ID.list } as never,
    tasks: tasks as unknown as DailyBoardView['tasks'],
    carryOver: Array.from({ length: carryOver }) as never,
  }
}

function okWeather(): WeatherLookup {
  return {
    ok: true,
    forecast: {
      location: 'Lisbon, Portugal',
      timezone: 'Europe/Lisbon',
      current: null,
      days: [
        {
          date: '2026-06-22',
          weekday: 'Monday',
          condition: 'Partly cloudy',
          tempMinC: 12,
          tempMaxC: 20,
          precipitationProbabilityPct: 30,
        },
      ],
    },
  }
}

async function setup(options?: {
  briefEnabled?: boolean
  homeLocation?: string | null
  entitlements?: Entitlement[]
  weather?: WeatherLookup
  events?: Array<{ title: string; startsAt: string }>
  board?: DailyBoardView
  briefTemplate?: { name: string; language: string }
  cap?: number
}) {
  const users = new InMemoryUserRepository()
  const user = User.createGuest({
    id: ID.user,
    displayName: 'Gabriel',
    locale: 'en',
    timezone: 'UTC',
    createdAt: NOW,
  })
  user.register({
    email: 'gabriel@example.com',
    passwordHash: 'x',
    emailVerifiedAt: null,
  })
  user.updateProfile({
    briefEnabled: options?.briefEnabled ?? true,
    briefHour: 9,
    homeLocation:
      options?.homeLocation === undefined ? 'Lisbon' : options.homeLocation,
  })
  await users.save(user)

  const sendProactiveMessage = vi.fn().mockResolvedValue({ delivered: true })
  const getForecast = vi.fn().mockResolvedValue(options?.weather ?? okWeather())

  const sendDailyBrief = makeSendDailyBrief({
    users,
    entitlements: {
      for: async () => ({
        plan: 'pro',
        entitlements: options?.entitlements ?? ['proactiveMessaging'],
      }),
    },
    getDailyBoard: (async () =>
      options?.board ??
      board([
        { status: 'completed', title: 'Book venue' },
        { status: 'pending', title: 'Choose cake' },
      ])) as never,
    listCalendarEvents: (async () =>
      (options?.events ?? [
        { title: 'Standup', startsAt: '2026-06-22T09:00:00.000Z' },
      ]) as unknown as CalendarEventView[]) as never,
    weather: {
      getForecast,
      resolveLocation: async () => ({ ok: false, reason: 'unavailable' }),
    },
    sendProactiveMessage,
    sendGuard: new InMemoryProactiveSendGuard(options?.cap ?? 3),
    clock: new FixedClock(NOW),
    briefTemplate: options?.briefTemplate,
  })

  return { sendDailyBrief, sendProactiveMessage, getForecast }
}

describe('sendDailyBrief', () => {
  it('composes and delivers a brief for an entitled, opted-in user', async () => {
    const { sendDailyBrief, sendProactiveMessage } = await setup()

    const result = await sendDailyBrief(ID.user)

    expect(result).toEqual({ sent: true })
    const [, message] = sendProactiveMessage.mock.calls[0]!
    expect(message.text).toContain('Good morning')
    expect(message.text).toContain('• Choose cake')
    expect(message.text).toContain('• 09:00 Standup')
    expect(message.text).toContain('Lisbon, Portugal')
    expect(message.template).toBeUndefined()
  })

  it('sends the daily_brief template with the composed text as its param', async () => {
    const { sendDailyBrief, sendProactiveMessage } = await setup({
      briefTemplate: { name: 'daily_brief', language: 'pt_BR' },
    })

    await sendDailyBrief(ID.user)

    const [, message] = sendProactiveMessage.mock.calls[0]!
    expect(message.template.name).toBe('daily_brief')
    expect(message.template.language).toBe('en')
    expect(message.template.params).toEqual([message.text])
  })

  it('does not send when the brief is disabled', async () => {
    const { sendDailyBrief, sendProactiveMessage } = await setup({
      briefEnabled: false,
    })
    expect(await sendDailyBrief(ID.user)).toEqual({ sent: false })
    expect(sendProactiveMessage).not.toHaveBeenCalled()
  })

  it('does not send when the plan lacks the proactive entitlement', async () => {
    const { sendDailyBrief, sendProactiveMessage } = await setup({
      entitlements: ['whatsappAssistant'],
    })
    expect(await sendDailyBrief(ID.user)).toEqual({ sent: false })
    expect(sendProactiveMessage).not.toHaveBeenCalled()
  })

  it('does nothing for an unknown user', async () => {
    const { sendDailyBrief } = await setup()
    expect(
      await sendDailyBrief('00000000-0000-4000-8000-000000000000'),
    ).toEqual({ sent: false })
  })

  it('stops sending once the daily cap is reached', async () => {
    const { sendDailyBrief, sendProactiveMessage } = await setup({ cap: 1 })

    expect(await sendDailyBrief(ID.user)).toEqual({ sent: true })
    expect(await sendDailyBrief(ID.user)).toEqual({ sent: false })
    expect(sendProactiveMessage).toHaveBeenCalledOnce()
  })

  it('omits the weather line when there is no saved home location', async () => {
    const { sendDailyBrief, sendProactiveMessage, getForecast } = await setup({
      homeLocation: null,
    })

    await sendDailyBrief(ID.user)

    expect(getForecast).not.toHaveBeenCalled()
    const [, message] = sendProactiveMessage.mock.calls[0]!
    expect(message.text).not.toContain('🌤️')
  })

  it('drops the weather line when the lookup fails', async () => {
    const { sendDailyBrief, sendProactiveMessage } = await setup({
      weather: { ok: false, reason: 'unavailable' },
    })

    await sendDailyBrief(ID.user)

    const [, message] = sendProactiveMessage.mock.calls[0]!
    expect(message.text).not.toContain('🌤️')
  })
})
