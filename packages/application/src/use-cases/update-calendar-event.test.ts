import { describe, expect, it, vi } from 'vitest'
import { CalendarEvent, asEntityId } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryCalendarEventRepository } from '@/testing/in-memory-calendar-event-repository'
import { makeUpdateCalendarEvent } from '@/use-cases/update-calendar-event'

const NOW = new Date('2026-06-24T10:00:00.000Z')
const LATER = new Date('2026-06-24T12:00:00.000Z')
const OWNER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'
const OTHER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

async function setup() {
  const calendarEvents = new InMemoryCalendarEventRepository()
  await calendarEvents.save(
    CalendarEvent.create({
      id: asEntityId(ID),
      ownerId: asEntityId(OWNER_ID),
      title: 'Dentist',
      startsAt: new Date('2026-06-25T09:00:00.000Z'),
      endsAt: new Date('2026-06-25T10:00:00.000Z'),
      now: NOW,
    }),
  )
  const enqueue = vi.fn().mockResolvedValue(undefined)
  const update = makeUpdateCalendarEvent({
    calendarEvents,
    jobQueue: { enqueue },
    clock: { now: () => LATER },
  })
  return { calendarEvents, update, enqueue }
}

describe('updateCalendarEvent', () => {
  it('updates a field and bumps the timestamp', async () => {
    const { update } = await setup()
    const view = await update(OWNER_ID, ID, { title: 'Dentist appointment' })
    expect(view.title).toBe('Dentist appointment')
    expect(view.updatedAt).toBe(LATER.toISOString())
  })

  it('arms reminder jobs for future offsets added on edit', async () => {
    const { update, enqueue } = await setup()
    await update(OWNER_ID, ID, { reminders: [30] })
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'event-reminder',
        payload: { eventId: ID, userId: OWNER_ID, minutesBefore: 30 },
        runAt: new Date('2026-06-25T08:30:00.000Z'),
      }),
    )
  })

  it('rejects an unknown event', async () => {
    const { update } = await setup()
    await expect(
      update(OWNER_ID, OTHER_ID, { title: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('hides events owned by someone else', async () => {
    const { update } = await setup()
    await expect(update(OTHER_ID, ID, { title: 'x' })).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })
})
