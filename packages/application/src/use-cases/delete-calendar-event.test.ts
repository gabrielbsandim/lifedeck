import { describe, expect, it, vi } from 'vitest'
import { CalendarEvent, asEntityId } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryCalendarEventRepository } from '@/testing/in-memory-calendar-event-repository'
import { makeDeleteCalendarEvent } from '@/use-cases/delete-calendar-event'
import { CALENDAR_DELETE_JOB } from '@/use-cases/calendar-sync-jobs'

const NOW = new Date('2026-06-24T10:00:00.000Z')
const OWNER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'
const OTHER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

async function setup(externalId?: string) {
  const calendarEvents = new InMemoryCalendarEventRepository()
  const event = CalendarEvent.create({
    id: asEntityId(ID),
    ownerId: asEntityId(OWNER_ID),
    title: 'Dentist',
    startsAt: new Date('2026-06-25T09:00:00.000Z'),
    endsAt: new Date('2026-06-25T10:00:00.000Z'),
    now: NOW,
  })
  if (externalId) {
    event.linkToExternal(externalId, 'etag-1', NOW)
  }
  await calendarEvents.save(event)
  const enqueue = vi.fn().mockResolvedValue(undefined)
  const remove = makeDeleteCalendarEvent({
    calendarEvents,
    jobQueue: { enqueue },
    clock: { now: () => NOW },
  })
  return { calendarEvents, remove, enqueue }
}

describe('deleteCalendarEvent', () => {
  it('removes an owned event without a remote link', async () => {
    const { calendarEvents, remove, enqueue } = await setup()
    await remove(OWNER_ID, ID)
    expect(await calendarEvents.findById(asEntityId(ID))).toBeNull()
    expect(enqueue).not.toHaveBeenCalled()
  })

  it('enqueues a remote delete when the event is synced', async () => {
    const { remove, enqueue } = await setup('g-1')
    await remove(OWNER_ID, ID)
    expect(enqueue).toHaveBeenCalledWith({
      type: CALENDAR_DELETE_JOB,
      payload: { userId: OWNER_ID, externalId: 'g-1' },
      runAt: NOW,
    })
  })

  it('rejects deleting an event owned by someone else', async () => {
    const { remove } = await setup()
    await expect(remove(OTHER_ID, ID)).rejects.toBeInstanceOf(NotFoundError)
  })
})
