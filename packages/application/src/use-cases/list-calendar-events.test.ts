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

const MASTER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const MASTER_EXT = 'english-master'
const JULY = {
  from: '2026-07-01T00:00:00.000Z',
  to: '2026-07-31T23:59:59.000Z',
}

function weeklyMaster(): CalendarEvent {
  // Weekly on Wednesdays since 2025-02-26 (a Wednesday), synced from Google.
  return CalendarEvent.create({
    id: asEntityId(MASTER_ID),
    ownerId: asEntityId(OWNER_ID),
    title: 'English Class',
    startsAt: new Date('2025-02-26T18:00:00.000Z'),
    endsAt: new Date('2025-02-26T18:50:00.000Z'),
    recurrence: {
      freq: 'weekly',
      interval: 1,
      byWeekday: [3],
      startDate: '2025-02-26',
    },
    source: 'google',
    externalId: MASTER_EXT,
    now: NOW,
  })
}

function override(
  id: string,
  originalStartsAt: string,
  overrides: Partial<{
    title: string
    startsAt: string
    endsAt: string
    cancelled: boolean
  }> = {},
): CalendarEvent {
  const startsAt = overrides.startsAt ?? originalStartsAt
  return CalendarEvent.create({
    id: asEntityId(id),
    ownerId: asEntityId(OWNER_ID),
    title: overrides.title ?? 'English Class',
    startsAt: new Date(startsAt),
    endsAt: new Date(overrides.endsAt ?? startsAt),
    recurrenceMasterExternalId: MASTER_EXT,
    originalStartsAt: new Date(originalStartsAt),
    cancelled: overrides.cancelled ?? false,
    source: 'google',
    externalId: `${MASTER_EXT}_${originalStartsAt}`,
    now: NOW,
  })
}

describe('listCalendarEvents recurrence expansion', () => {
  it('expands a weekly master into one occurrence per firing day', async () => {
    const calendarEvents = new InMemoryCalendarEventRepository()
    await calendarEvents.save(weeklyMaster())
    const list = makeListCalendarEvents({ calendarEvents })

    const views = await list(OWNER_ID, JULY)

    expect(views.map(view => view.startsAt)).toEqual([
      '2026-07-01T18:00:00.000Z',
      '2026-07-08T18:00:00.000Z',
      '2026-07-15T18:00:00.000Z',
      '2026-07-22T18:00:00.000Z',
      '2026-07-29T18:00:00.000Z',
    ])
    const first = views[0]
    expect(first?.recurring).toBe(true)
    expect(first?.seriesId).toBe(MASTER_ID)
    expect(first?.occurrenceStart).toBe('2026-07-01T18:00:00.000Z')
    expect(first?.recurrence).toBeNull()
    expect(first?.id).toBe(`${MASTER_ID}::2026-07-01T18:00:00.000Z`)
  })

  it('applies a modified occurrence override in place', async () => {
    const calendarEvents = new InMemoryCalendarEventRepository()
    await calendarEvents.save(weeklyMaster())
    await calendarEvents.save(
      override(
        '11111111-1111-4111-8111-111111111111',
        '2026-07-15T18:00:00.000Z',
        {
          title: 'English (moved)',
          startsAt: '2026-07-15T19:00:00.000Z',
          endsAt: '2026-07-15T19:50:00.000Z',
        },
      ),
    )
    const list = makeListCalendarEvents({ calendarEvents })

    const views = await list(OWNER_ID, JULY)
    const fifteenth = views.filter(view =>
      view.startsAt.startsWith('2026-07-15'),
    )
    expect(fifteenth).toHaveLength(1)
    expect(fifteenth[0]?.title).toBe('English (moved)')
    expect(fifteenth[0]?.startsAt).toBe('2026-07-15T19:00:00.000Z')
    expect(fifteenth[0]?.seriesId).toBe(MASTER_ID)
  })

  it('hides a cancelled occurrence', async () => {
    const calendarEvents = new InMemoryCalendarEventRepository()
    await calendarEvents.save(weeklyMaster())
    await calendarEvents.save(
      override(
        '22222222-2222-4222-8222-222222222222',
        '2026-07-22T18:00:00.000Z',
        {
          cancelled: true,
        },
      ),
    )
    const list = makeListCalendarEvents({ calendarEvents })

    const views = await list(OWNER_ID, JULY)
    expect(views.some(view => view.startsAt.startsWith('2026-07-22'))).toBe(
      false,
    )
    expect(views).toHaveLength(4)
  })

  it('includes an override moved into the window from an out-of-window slot', async () => {
    const calendarEvents = new InMemoryCalendarEventRepository()
    await calendarEvents.save(weeklyMaster())
    // Original slot Aug 5 (outside July) moved to Jul 6 (inside July).
    await calendarEvents.save(
      override(
        '33333333-3333-4333-8333-333333333333',
        '2026-08-05T18:00:00.000Z',
        {
          title: 'English (early)',
          startsAt: '2026-07-06T18:00:00.000Z',
          endsAt: '2026-07-06T18:50:00.000Z',
        },
      ),
    )
    const list = makeListCalendarEvents({ calendarEvents })

    const views = await list(OWNER_ID, JULY)
    const moved = views.find(view => view.title === 'English (early)')
    expect(moved?.startsAt).toBe('2026-07-06T18:00:00.000Z')
    expect(moved?.seriesId).toBe(MASTER_ID)
  })
})
