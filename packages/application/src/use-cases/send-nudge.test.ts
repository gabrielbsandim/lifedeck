import { describe, expect, it, vi } from 'vitest'
import { User, asEntityId, type Plan } from '@lifedeck/domain'
import { makeSendNudge } from '@/use-cases/send-nudge'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { InMemoryNudgeLogRepository } from '@/testing/in-memory-nudge-log-repository'
import { InMemoryProactiveSendGuard } from '@/testing/in-memory-proactive-send-guard'
import { InMemoryConversationStore } from '@/testing/in-memory-conversation-store'
import { FixedClock, SequentialIdGenerator, ID } from '@/testing/fakes'

// Noon UTC; the user sits in UTC so "today" is 2026-07-20 there.
const NOW = new Date('2026-07-20T12:00:00.000Z')
const TASK_A = '11111111-1111-4111-8111-111111111111'
const NUDGE_LOG_ID = asEntityId('99999999-9999-4999-8999-999999999999')

type TaskLike = {
  id: string
  title: string
  status: string
  carriedFromDate: string | null
}

// Carried from 4 days before today -> past the 3-day threshold.
const STALE: TaskLike = {
  id: TASK_A,
  title: 'Call dentist',
  status: 'pending',
  carriedFromDate: '2026-07-16',
}

async function setup(options?: {
  plan?: Plan
  nudgesEnabled?: boolean
  quietHours?: [number, number]
  tasks?: TaskLike[]
  seedLogs?: { key: string; date: string }[]
  cap?: number
  nudgeTemplate?: { name: string; language: string }
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
  if (options?.nudgesEnabled === false) {
    user.updateProfile({ nudgesEnabled: false })
  }
  if (options?.quietHours) {
    user.updateProfile({
      quietHoursStart: options.quietHours[0],
      quietHoursEnd: options.quietHours[1],
    })
  }
  await users.save(user)

  const nudgeLogs = new InMemoryNudgeLogRepository()
  for (const log of options?.seedLogs ?? []) {
    await nudgeLogs.record({
      id: NUDGE_LOG_ID,
      userId: ID.user,
      key: log.key,
      date: log.date,
      createdAt: NOW,
    })
  }

  const sendProactiveMessage = vi.fn().mockResolvedValue({ delivered: true })
  const conversations = new InMemoryConversationStore()
  const sendNudge = makeSendNudge({
    users,
    entitlements: {
      for: async () => ({ plan: options?.plan ?? 'premium', entitlements: [] }),
    },
    getDailyBoard: (async () => ({
      list: { id: ID.list },
      tasks: options?.tasks ?? [STALE],
      carryOver: [],
    })) as never,
    nudgeLogs,
    sendProactiveMessage,
    sendGuard: new InMemoryProactiveSendGuard(options?.cap ?? 3),
    conversations,
    ids: new SequentialIdGenerator([NUDGE_LOG_ID]),
    clock: new FixedClock(NOW),
    nudgeTemplate: options?.nudgeTemplate,
  })

  return { sendNudge, sendProactiveMessage, nudgeLogs, conversations }
}

describe('sendNudge', () => {
  it('nudges a premium user about their longest-carried task and logs it', async () => {
    const { sendNudge, sendProactiveMessage, nudgeLogs, conversations } =
      await setup()

    const result = await sendNudge(ID.user)

    expect(result).toEqual({ sent: true })
    const [, message] = sendProactiveMessage.mock.calls[0]!
    expect(message.text).toContain('Call dentist')
    expect(message.text).toContain('4 days')
    expect(message.template).toBeUndefined()
    // Two quick-reply buttons whose ids carry the task, so a tap can be traced.
    expect(message.buttons).toEqual([
      { id: `nudge_yes:${TASK_A}`, title: 'Yes, reschedule' },
      { id: `nudge_no:${TASK_A}`, title: 'Not today' },
    ])
    expect(await nudgeLogs.hasSentOn(ID.user, '2026-07-20')).toBe(true)
    // The nudge is seeded into history so a reply reaches the assistant in context.
    expect(await conversations.load(ID.user)).toEqual([
      { role: 'assistant', content: message.text },
    ])
  })

  it('sends the nudge template with the composed text as its param', async () => {
    const { sendNudge, sendProactiveMessage } = await setup({
      nudgeTemplate: { name: 'nudge', language: 'pt_BR' },
    })

    await sendNudge(ID.user)

    const [, message] = sendProactiveMessage.mock.calls[0]!
    expect(message.template.name).toBe('nudge')
    expect(message.template.language).toBe('en')
    expect(message.template.params).toEqual([message.text])
  })

  it('does not nudge a non-premium user', async () => {
    const { sendNudge, sendProactiveMessage } = await setup({ plan: 'pro' })
    expect(await sendNudge(ID.user)).toEqual({ sent: false })
    expect(sendProactiveMessage).not.toHaveBeenCalled()
  })

  it('does not nudge when the user opted out', async () => {
    const { sendNudge, sendProactiveMessage } = await setup({
      nudgesEnabled: false,
    })
    expect(await sendNudge(ID.user)).toEqual({ sent: false })
    expect(sendProactiveMessage).not.toHaveBeenCalled()
  })

  it('stays silent during the user quiet hours', async () => {
    const { sendNudge, sendProactiveMessage } = await setup({
      quietHours: [8, 20], // noon falls inside
    })
    expect(await sendNudge(ID.user)).toEqual({ sent: false })
    expect(sendProactiveMessage).not.toHaveBeenCalled()
  })

  it('sends at most one nudge per day', async () => {
    const { sendNudge, sendProactiveMessage } = await setup({
      seedLogs: [{ key: 'carried_task:other', date: '2026-07-20' }],
    })
    expect(await sendNudge(ID.user)).toEqual({ sent: false })
    expect(sendProactiveMessage).not.toHaveBeenCalled()
  })

  it('does not nudge when no task has lingered past the threshold', async () => {
    const { sendNudge } = await setup({
      tasks: [{ ...STALE, carriedFromDate: '2026-07-19' }], // only 1 day old
    })
    expect(await sendNudge(ID.user)).toEqual({ sent: false })
  })

  it('respects the per-task cooldown', async () => {
    const { sendNudge, sendProactiveMessage } = await setup({
      seedLogs: [{ key: `carried_task:${TASK_A}`, date: '2026-07-19' }],
    })
    expect(await sendNudge(ID.user)).toEqual({ sent: false })
    expect(sendProactiveMessage).not.toHaveBeenCalled()
  })

  it('is blocked by the shared daily cap', async () => {
    const { sendNudge, sendProactiveMessage } = await setup({ cap: 0 })
    expect(await sendNudge(ID.user)).toEqual({ sent: false })
    expect(sendProactiveMessage).not.toHaveBeenCalled()
  })

  it('does nothing for an unknown user', async () => {
    const { sendNudge } = await setup()
    expect(await sendNudge('00000000-0000-4000-8000-000000000000')).toEqual({
      sent: false,
    })
  })
})
