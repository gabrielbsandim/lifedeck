import { describe, expect, it } from 'vitest'
import { CalendarEvent, asEntityId } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryCalendarEventRepository } from '@/testing/in-memory-calendar-event-repository'
import { makeDeleteCalendarEvent } from '@/use-cases/delete-calendar-event'

const NOW = new Date('2026-06-24T10:00:00.000Z')
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
  const remove = makeDeleteCalendarEvent({ calendarEvents })
  return { calendarEvents, remove }
}

describe('deleteCalendarEvent', () => {
  it('removes an owned event', async () => {
    const { calendarEvents, remove } = await setup()
    await remove(OWNER_ID, ID)
    expect(await calendarEvents.findById(asEntityId(ID))).toBeNull()
  })

  it('rejects deleting an event owned by someone else', async () => {
    const { remove } = await setup()
    await expect(remove(OTHER_ID, ID)).rejects.toBeInstanceOf(NotFoundError)
  })
})
