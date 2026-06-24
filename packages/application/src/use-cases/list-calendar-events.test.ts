import { describe, expect, it } from 'vitest'
import { CalendarEvent, ValidationError, asEntityId } from '@lifedeck/domain'
import { InMemoryCalendarEventRepository } from '@/testing/in-memory-calendar-event-repository'
import { makeListCalendarEvents } from '@/use-cases/list-calendar-events'

const NOW = new Date('2026-06-24T10:00:00.000Z')
const OWNER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'

function eventAt(id: string, startsAt: string, endsAt: string): CalendarEvent {
  return CalendarEvent.create({
    id: asEntityId(id),
    ownerId: asEntityId(OWNER_ID),
    title: 'Event',
    startsAt: new Date(startsAt),
    endsAt: new Date(endsAt),
    now: NOW,
  })
}

async function setup() {
  const calendarEvents = new InMemoryCalendarEventRepository()
  await calendarEvents.save(
    eventAt(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '2026-06-25T09:00:00.000Z',
      '2026-06-25T10:00:00.000Z',
    ),
  )
  await calendarEvents.save(
    eventAt(
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      '2026-07-10T09:00:00.000Z',
      '2026-07-10T10:00:00.000Z',
    ),
  )
  const list = makeListCalendarEvents({ calendarEvents })
  return { list }
}

describe('listCalendarEvents', () => {
  it('returns only events overlapping the range', async () => {
    const { list } = await setup()
    const views = await list(OWNER_ID, {
      from: '2026-06-24T00:00:00.000Z',
      to: '2026-06-30T00:00:00.000Z',
    })
    expect(views).toHaveLength(1)
    expect(views[0]?.startsAt).toBe('2026-06-25T09:00:00.000Z')
  })

  it('rejects an inverted range', async () => {
    const { list } = await setup()
    await expect(
      list(OWNER_ID, {
        from: '2026-06-30T00:00:00.000Z',
        to: '2026-06-24T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ValidationError)
  })
})
