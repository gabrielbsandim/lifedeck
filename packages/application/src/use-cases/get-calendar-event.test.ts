import { describe, expect, it } from 'vitest'
import { CalendarEvent, asEntityId } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryCalendarEventRepository } from '@/testing/in-memory-calendar-event-repository'
import { makeGetCalendarEvent } from '@/use-cases/get-calendar-event'

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
  return { get: makeGetCalendarEvent({ calendarEvents }) }
}

describe('getCalendarEvent', () => {
  it('returns the owned event view', async () => {
    const { get } = await setup()
    const view = await get(OWNER_ID, ID)
    expect(view.title).toBe('Dentist')
  })

  it('hides events owned by someone else', async () => {
    const { get } = await setup()
    await expect(get(OTHER_ID, ID)).rejects.toBeInstanceOf(NotFoundError)
  })
})
