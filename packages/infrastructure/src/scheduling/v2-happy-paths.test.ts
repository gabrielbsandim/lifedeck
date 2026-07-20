import { describe, expect, it, vi } from 'vitest'
import { asEntityId, type Entitlement } from '@lifedeck/domain'
import {
  CALENDAR_PUSH_JOB,
  InMemoryCalendarEventRepository,
  InMemoryChannelIdentityRepository,
  InMemoryConversationStore,
  InMemoryNotificationRepository,
  InMemoryScheduledJobRepository,
  InMemoryUsageEventLedger,
  InMemoryUsageMeter,
  InMemoryUserRepository,
  FakeEmailSender,
  REMINDER_JOB,
  makeConsumeCredits,
  makeRefundCredits,
  makeCreateCalendarEvent,
  makeDeliverReminder,
  makeSendProactiveMessage,
  makeDispatchDueJobs,
  makeHandleInboundWhatsApp,
  makeStartWhatsappPairing,
  NoopWhatsappSessionWindow,
  type AgentRunner,
} from '@lifedeck/application'
import { OutboxJobQueue } from '@/scheduling/outbox-job-queue'
import { NoopJobScheduler } from '@/scheduling/noop-job-scheduler'

const USER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'
const PHONE = '5511999990000'

function sequentialIds() {
  let n = 0
  return {
    generate() {
      n += 1
      const tail = String(n).padStart(12, '0')
      return asEntityId(`aaaaaaaa-aaaa-4aaa-8aaa-${tail}`)
    },
  }
}

function mutableClock(start: Date) {
  let current = new Date(start)
  return {
    now: () => new Date(current),
    set: (next: Date) => {
      current = new Date(next)
    },
  }
}

describe('V2 calendar reminder happy path', () => {
  it('arms a reminder on create and delivers it when the job is due', async () => {
    const clock = mutableClock(new Date('2026-06-24T08:00:00.000Z'))
    const ids = sequentialIds()
    const calendarEvents = new InMemoryCalendarEventRepository()
    const scheduledJobs = new InMemoryScheduledJobRepository()
    const notifications = new InMemoryNotificationRepository()
    const channelIdentities = new InMemoryChannelIdentityRepository()
    const messaging = {
      sendText: vi.fn().mockResolvedValue(undefined),
      sendTemplate: vi.fn().mockResolvedValue(undefined),
      fetchMedia: vi.fn(),
    }
    const jobQueue = new OutboxJobQueue(
      scheduledJobs,
      ids,
      clock,
      new NoopJobScheduler(),
    )

    const createEvent = makeCreateCalendarEvent({
      calendarEvents,
      jobQueue,
      ids,
      clock,
    })
    const deliverReminder = makeDeliverReminder({
      calendarEvents,
      notifications,
      users: new InMemoryUserRepository(),
      emailSender: new FakeEmailSender(),
      sendProactiveMessage: makeSendProactiveMessage({
        channelIdentities,
        messaging,
      }),
      jobQueue,
      ids,
      clock,
    })
    const dispatch = makeDispatchDueJobs({
      scheduledJobs,
      handlers: {
        [CALENDAR_PUSH_JOB]: async () => {},
        [REMINDER_JOB]: payload =>
          deliverReminder(
            payload.eventId as string,
            payload.userId as string,
            Number(payload.minutesBefore),
          ).then(() => undefined),
      },
      clock,
    })

    const event = await createEvent(USER_ID, {
      title: 'Dentist',
      startsAt: '2026-06-24T09:00:00.000Z',
      endsAt: '2026-06-24T10:00:00.000Z',
      reminders: [30],
    })

    // Nothing is due yet at 08:00.
    expect(await dispatch()).toMatchObject({ succeeded: 1 }) // the push job only

    // Move to the reminder fire time (08:30) and run the queue again.
    clock.set(new Date('2026-06-24T08:30:00.000Z'))
    const result = await dispatch()

    expect(result.failed).toBe(0)
    const stored = await notifications.listByUser(asEntityId(USER_ID), 10)
    expect(stored).toHaveLength(1)
    const note = stored[0]?.toJSON()
    expect(note?.type).toBe(REMINDER_JOB)
    expect(note?.data.eventId).toBe(event.id)
  })
})

describe('V2 whatsapp assistant happy path', () => {
  it('links a number, then routes a message through the agent and replies', async () => {
    const clock = mutableClock(new Date('2026-06-24T08:00:00.000Z'))
    const ids = sequentialIds()
    const channelIdentities = new InMemoryChannelIdentityRepository()
    const calendarEvents = new InMemoryCalendarEventRepository()
    const scheduledJobs = new InMemoryScheduledJobRepository()
    const conversations = new InMemoryConversationStore()
    const usageMeter = new InMemoryUsageMeter()
    const ledger = new InMemoryUsageEventLedger()
    const messaging = {
      sendText: vi.fn().mockResolvedValue(undefined),
      sendTemplate: vi.fn().mockResolvedValue(undefined),
      fetchMedia: vi.fn(),
    }
    const jobQueue = new OutboxJobQueue(
      scheduledJobs,
      ids,
      clock,
      new NoopJobScheduler(),
    )
    const createEvent = makeCreateCalendarEvent({
      calendarEvents,
      jobQueue,
      ids,
      clock,
    })

    // The agent acts as the tool runner: it books the event the user asked for
    // and confirms back in natural language.
    const agent: AgentRunner = {
      run: async ({ userId }) => {
        await createEvent(userId, {
          title: 'Dentist',
          startsAt: '2026-06-25T09:00:00.000Z',
          endsAt: '2026-06-25T10:00:00.000Z',
        })
        return { text: 'Booked your dentist appointment for tomorrow at 9am.' }
      },
    }

    const startPairing = makeStartWhatsappPairing({
      channelIdentities,
      codes: { generate: () => '123456' },
      ids,
      clock,
    })
    const consumeCredits = makeConsumeCredits({
      usageMeter,
      ledger,
      resolvePlan: async () => 'pro',
      ids,
      clock,
    })
    const refundCredits = makeRefundCredits({ usageMeter })
    const handleInbound = makeHandleInboundWhatsApp({
      channelIdentities,
      users: new InMemoryUserRepository(),
      messaging,
      entitlements: {
        for: async () => ({
          plan: 'pro',
          entitlements: ['whatsappAssistant'] as Entitlement[],
        }),
      },
      consumeCredits,
      refundCredits,
      agent,
      conversations,
      transcriber: { transcribe: vi.fn(), isAvailable: () => true },
      visionReader: { describe: vi.fn(), isAvailable: () => true },
      clock,
      logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
      whatsappSession: new NoopWhatsappSessionWindow(),
    })

    const pairing = await startPairing(USER_ID, PHONE)
    expect(pairing.status).toBe('pending')
    const code = pairing.status === 'pending' ? pairing.code : ''

    const linked = await handleInbound({
      from: PHONE,
      kind: 'text',
      text: code,
    })
    expect(linked.action).toBe('linked')

    const reply = await handleInbound({
      from: PHONE,
      kind: 'text',
      text: 'Please book my dentist appointment for tomorrow at 9am.',
    })

    expect(reply.action).toBe('reply')
    const events = await calendarEvents.listByOwner(asEntityId(USER_ID))
    expect(events).toHaveLength(1)
    expect(events[0]?.toJSON().title).toBe('Dentist')
    expect(messaging.sendText).toHaveBeenLastCalledWith(
      PHONE,
      'Booked your dentist appointment for tomorrow at 9am.',
    )
    const history = await conversations.load(USER_ID)
    expect(history).toHaveLength(2)
    expect(ledger.events).toHaveLength(1)
  })
})
