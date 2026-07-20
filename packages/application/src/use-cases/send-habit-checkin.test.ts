import { describe, expect, it, vi } from 'vitest'
import {
  Habit,
  HabitLog,
  User,
  asEntityId,
  type Entitlement,
  type HabitCadence,
  type EntityId,
} from '@lifedeck/domain'
import { makeSendHabitCheckin } from '@/use-cases/send-habit-checkin'
import { InMemoryHabitRepository } from '@/testing/in-memory-habit-repository'
import { InMemoryHabitLogRepository } from '@/testing/in-memory-habit-log-repository'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { InMemoryProactiveSendGuard } from '@/testing/in-memory-proactive-send-guard'
import { FixedClock, ID } from '@/testing/fakes'

// Noon UTC on Monday 2026-07-20; the user sits in UTC so "today" is that date.
const NOW = new Date('2026-07-20T12:00:00.000Z')
const HABIT = asEntityId('11111111-1111-4111-8111-111111111111')
const LOG = asEntityId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')

async function setup(options?: {
  active?: boolean
  checkinHour?: number | null
  cadence?: HabitCadence
  entitlements?: Entitlement[]
  alreadyLogged?: boolean
  checkinTemplate?: { name: string; language: string }
  cap?: number
  ownerId?: EntityId
}) {
  const habits = new InMemoryHabitRepository()
  const habitLogs = new InMemoryHabitLogRepository()
  const users = new InMemoryUserRepository()
  await users.save(
    User.createGuest({
      id: ID.user,
      displayName: 'Gabriel',
      locale: 'en',
      timezone: 'UTC',
      createdAt: NOW,
    }),
  )
  const habit = Habit.create({
    id: HABIT,
    ownerId: options?.ownerId ?? ID.user,
    title: 'Meditate',
    cadence: options?.cadence ?? { kind: 'daily' },
    checkinHour: options?.checkinHour === undefined ? 8 : options.checkinHour,
    createdAt: NOW,
  })
  habit.setActive(options?.active ?? true)
  await habits.save(habit)
  if (options?.alreadyLogged) {
    await habitLogs.save(
      HabitLog.create({
        id: LOG,
        habitId: HABIT,
        date: '2026-07-20',
        createdAt: NOW,
      }),
    )
  }

  const sendProactiveMessage = vi.fn().mockResolvedValue({ delivered: true })
  const sendHabitCheckin = makeSendHabitCheckin({
    habits,
    habitLogs,
    users,
    entitlements: {
      for: async () => ({
        plan: 'pro',
        entitlements: options?.entitlements ?? ['proactiveMessaging'],
      }),
    },
    sendProactiveMessage,
    sendGuard: new InMemoryProactiveSendGuard(options?.cap ?? 3),
    clock: new FixedClock(NOW),
    checkinTemplate: options?.checkinTemplate,
  })

  return { sendHabitCheckin, sendProactiveMessage }
}

describe('sendHabitCheckin', () => {
  it('delivers a check-in for an entitled, scheduled, not-yet-done habit', async () => {
    const { sendHabitCheckin, sendProactiveMessage } = await setup()

    const result = await sendHabitCheckin(ID.user, HABIT)

    expect(result).toEqual({ sent: true })
    const [, message] = sendProactiveMessage.mock.calls[0]!
    expect(message.text).toContain('Did you Meditate today?')
    expect(message.template).toBeUndefined()
  })

  it('sends the habit_checkin template with the title as its param', async () => {
    const { sendHabitCheckin, sendProactiveMessage } = await setup({
      checkinTemplate: { name: 'habit_checkin', language: 'pt_BR' },
    })

    await sendHabitCheckin(ID.user, HABIT)

    const [, message] = sendProactiveMessage.mock.calls[0]!
    expect(message.template.name).toBe('habit_checkin')
    expect(message.template.language).toBe('en')
    expect(message.template.params).toEqual(['Meditate'])
  })

  it('does not send when the habit is paused', async () => {
    const { sendHabitCheckin, sendProactiveMessage } = await setup({
      active: false,
    })
    expect(await sendHabitCheckin(ID.user, HABIT)).toEqual({ sent: false })
    expect(sendProactiveMessage).not.toHaveBeenCalled()
  })

  it('does not send when the habit has no check-in hour', async () => {
    const { sendHabitCheckin } = await setup({ checkinHour: null })
    expect(await sendHabitCheckin(ID.user, HABIT)).toEqual({ sent: false })
  })

  it('does not send when the plan lacks the proactive entitlement', async () => {
    const { sendHabitCheckin, sendProactiveMessage } = await setup({
      entitlements: ['whatsappAssistant'],
    })
    expect(await sendHabitCheckin(ID.user, HABIT)).toEqual({ sent: false })
    expect(sendProactiveMessage).not.toHaveBeenCalled()
  })

  it('does nothing for an unknown habit', async () => {
    const { sendHabitCheckin } = await setup()
    expect(
      await sendHabitCheckin(
        ID.user,
        asEntityId('00000000-0000-4000-8000-000000000000'),
      ),
    ).toEqual({ sent: false })
  })

  it('does nothing for a habit owned by someone else', async () => {
    const { sendHabitCheckin } = await setup({ ownerId: ID.otherUser })
    expect(await sendHabitCheckin(ID.user, HABIT)).toEqual({ sent: false })
  })

  it('does not send on a day the habit is not scheduled', async () => {
    const { sendHabitCheckin, sendProactiveMessage } = await setup({
      cadence: { kind: 'weekdays', weekdays: [2, 4] }, // Tue/Thu, not Monday
    })
    expect(await sendHabitCheckin(ID.user, HABIT)).toEqual({ sent: false })
    expect(sendProactiveMessage).not.toHaveBeenCalled()
  })

  it('does not send when the habit is already logged today', async () => {
    const { sendHabitCheckin, sendProactiveMessage } = await setup({
      alreadyLogged: true,
    })
    expect(await sendHabitCheckin(ID.user, HABIT)).toEqual({ sent: false })
    expect(sendProactiveMessage).not.toHaveBeenCalled()
  })

  it('stops once the daily cap is reached', async () => {
    const { sendHabitCheckin, sendProactiveMessage } = await setup({ cap: 1 })

    expect(await sendHabitCheckin(ID.user, HABIT)).toEqual({ sent: true })
    expect(await sendHabitCheckin(ID.user, HABIT)).toEqual({ sent: false })
    expect(sendProactiveMessage).toHaveBeenCalledOnce()
  })
})
