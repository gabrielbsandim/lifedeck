import { describe, expect, it, vi } from 'vitest'
import { asEntityId } from '@lifedeck/domain'
import { InMemoryCalendarEventRepository } from '@/testing/in-memory-calendar-event-repository'
import { makeCreateCalendarEvent } from '@/use-cases/create-calendar-event'
import { CALENDAR_PUSH_JOB } from '@/use-cases/calendar-sync-jobs'
import { REMINDER_JOB } from '@/use-cases/reminder-jobs'

const NOW = new Date('2026-06-24T10:00:00.000Z')
const OWNER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'
const NEW_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

function setup() {
  const calendarEvents = new InMemoryCalendarEventRepository()
  const enqueue = vi.fn().mockResolvedValue(undefined)
  const create = makeCreateCalendarEvent({
    calendarEvents,
    jobQueue: { enqueue },
    ids: { generate: () => asEntityId(NEW_ID) },
    clock: { now: () => NOW },
  })
  return { calendarEvents, create, enqueue }
}

describe('createCalendarEvent', () => {
  it('persists a new event and enqueues an outbound push', async () => {
    const { calendarEvents, create, enqueue } = setup()
    const view = await create(OWNER_ID, {
      title: 'Dentist',
      startsAt: '2026-06-25T09:00:00.000Z',
      endsAt: '2026-06-25T10:00:00.000Z',
      reminders: [30, 10],
    })
    expect(view.id).toBe(NEW_ID)
    expect(view.ownerId).toBe(OWNER_ID)
    expect(view.reminders).toEqual([10, 30])
    expect(view.startsAt).toBe('2026-06-25T09:00:00.000Z')
    expect(await calendarEvents.findById(asEntityId(NEW_ID))).not.toBeNull()
    expect(enqueue).toHaveBeenCalledWith({
      type: CALENDAR_PUSH_JOB,
      payload: { userId: OWNER_ID, eventId: NEW_ID },
      runAt: NOW,
    })
  })

  it('arms a reminder job for each future offset', async () => {
    const { create, enqueue } = setup()
    await create(OWNER_ID, {
      title: 'Dentist',
      startsAt: '2026-07-01T09:00:00.000Z',
      endsAt: '2026-07-01T10:00:00.000Z',
      reminders: [30],
    })
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: REMINDER_JOB,
        payload: { eventId: NEW_ID, userId: OWNER_ID, minutesBefore: 30 },
        runAt: new Date('2026-07-01T08:30:00.000Z'),
      }),
    )
  })

  it('rejects an invalid payload', async () => {
    const { create } = setup()
    await expect(
      create(OWNER_ID, {
        title: '',
        startsAt: '2026-06-25T09:00:00.000Z',
        endsAt: '2026-06-25T10:00:00.000Z',
      }),
    ).rejects.toThrow()
  })
})
