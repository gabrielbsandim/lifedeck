import { describe, expect, it, vi } from 'vitest'
import { CalendarEvent, asEntityId } from '@lifedeck/domain'
import { InMemoryCalendarEventRepository } from '@/testing/in-memory-calendar-event-repository'
import { InMemoryNotificationRepository } from '@/testing/in-memory-notification-repository'
import { makeDeliverReminder } from '@/use-cases/deliver-reminder'

const OWNER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'
const EVENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const NOTE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const STARTS = new Date('2026-06-25T09:00:00.000Z')

async function setup(options: {
  now: Date
  reminders?: number[]
  withEvent?: boolean
}) {
  const calendarEvents = new InMemoryCalendarEventRepository()
  if (options.withEvent !== false) {
    await calendarEvents.save(
      CalendarEvent.create({
        id: asEntityId(EVENT_ID),
        ownerId: asEntityId(OWNER_ID),
        title: 'Dentist',
        startsAt: STARTS,
        endsAt: new Date('2026-06-25T10:00:00.000Z'),
        reminders: options.reminders ?? [30],
        now: new Date('2026-06-24T00:00:00.000Z'),
      }),
    )
  }
  const notifications = new InMemoryNotificationRepository()
  const enqueue = vi.fn().mockResolvedValue(undefined)
  const deliver = makeDeliverReminder({
    calendarEvents,
    notifications,
    jobQueue: { enqueue },
    ids: { generate: () => asEntityId(NOTE_ID) },
    clock: { now: () => options.now },
  })
  return { notifications, deliver, enqueue }
}

describe('deliverReminder', () => {
  it('creates a notification at the reminder time', async () => {
    // 30 minutes before 09:00 is 08:30.
    const { notifications, deliver } = await setup({
      now: new Date('2026-06-25T08:30:00.000Z'),
    })
    const result = await deliver(EVENT_ID, OWNER_ID, 30)
    expect(result).toEqual({ delivered: true })
    const stored = await notifications.listByUser(asEntityId(OWNER_ID), 10)
    expect(stored[0]?.toJSON().type).toBe('event-reminder')
  })

  it('drops the reminder when the event is gone', async () => {
    const { deliver } = await setup({
      now: new Date('2026-06-25T08:30:00.000Z'),
      withEvent: false,
    })
    expect(await deliver(EVENT_ID, OWNER_ID, 30)).toEqual({ delivered: false })
  })

  it('drops the reminder when the offset was removed', async () => {
    const { deliver, enqueue } = await setup({
      now: new Date('2026-06-25T08:30:00.000Z'),
      reminders: [10],
    })
    expect(await deliver(EVENT_ID, OWNER_ID, 30)).toEqual({ delivered: false })
    expect(enqueue).not.toHaveBeenCalled()
  })

  it('re-arms the reminder when the event moved later', async () => {
    // Firing well before 08:30 means the event shifted later than expected.
    const { deliver, enqueue } = await setup({
      now: new Date('2026-06-25T07:00:00.000Z'),
    })
    const result = await deliver(EVENT_ID, OWNER_ID, 30)
    expect(result).toEqual({ delivered: false, rescheduled: true })
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ runAt: new Date('2026-06-25T08:30:00.000Z') }),
    )
  })

  it('skips a reminder that fires after the event started', async () => {
    const { deliver } = await setup({
      now: new Date('2026-06-25T09:30:00.000Z'),
    })
    expect(await deliver(EVENT_ID, OWNER_ID, 30)).toEqual({ delivered: false })
  })
})
