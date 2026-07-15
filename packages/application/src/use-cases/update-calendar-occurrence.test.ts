import { describe, expect, it, vi } from 'vitest'
import { CalendarEvent, ValidationError, asEntityId } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryCalendarEventRepository } from '@/testing/in-memory-calendar-event-repository'
import { makeUpdateCalendarOccurrence } from '@/use-cases/update-calendar-occurrence'

const NOW = new Date('2026-06-24T10:00:00.000Z')
const LATER = new Date('2026-07-14T10:00:00.000Z')
const OWNER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'
const OTHER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const SERIES = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const PLAIN = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
const MASTER_EXT = 'english-master'
const OCC = '2026-07-15T18:00:00.000Z'

function master(withExternal = true): CalendarEvent {
  return CalendarEvent.create({
    id: asEntityId(SERIES),
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
    source: withExternal ? 'google' : 'local',
    externalId: withExternal ? MASTER_EXT : null,
    now: NOW,
  })
}

async function setup(seed = master()) {
  const calendarEvents = new InMemoryCalendarEventRepository()
  await calendarEvents.save(seed)
  const enqueue = vi.fn().mockResolvedValue(undefined)
  let counter = 0
  const update = makeUpdateCalendarOccurrence({
    calendarEvents,
    jobQueue: { enqueue },
    ids: {
      generate: () =>
        asEntityId(`99999999-9999-4999-8999-99999999999${(counter += 1)}`),
    },
    clock: { now: () => LATER },
  })
  return { calendarEvents, update, enqueue }
}

const input = {
  occurrenceStart: OCC,
  title: 'English (moved)',
  startsAt: '2026-07-15T19:00:00.000Z',
  endsAt: '2026-07-15T19:50:00.000Z',
  reminders: [30],
}

describe('updateCalendarOccurrence', () => {
  it('creates an override pinned to the occurrence and enqueues a push', async () => {
    const { update, calendarEvents, enqueue } = await setup()
    const view = await update(OWNER_ID, SERIES, input)

    expect(view.title).toBe('English (moved)')
    expect(view.occurrenceStart).toBe(OCC)

    const stored = await calendarEvents.findOverrideByOriginalStart(
      asEntityId(OWNER_ID),
      MASTER_EXT,
      new Date(OCC),
    )
    expect(stored?.startsAt.toISOString()).toBe('2026-07-15T19:00:00.000Z')
    expect(stored?.cancelled).toBe(false)
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'calendar-push' }),
    )
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'event-reminder' }),
    )
  })

  it('updates an existing override instead of duplicating it', async () => {
    const { update, calendarEvents } = await setup()
    await update(OWNER_ID, SERIES, input)
    await update(OWNER_ID, SERIES, { ...input, title: 'English (again)' })

    const overrides = await calendarEvents.listOverridesByMasterExternalIds(
      asEntityId(OWNER_ID),
      [MASTER_EXT],
    )
    expect(overrides).toHaveLength(1)
    expect(overrides[0]?.title).toBe('English (again)')
  })

  it('rejects a non-recurring or unknown series', async () => {
    const { update, calendarEvents } = await setup()
    await calendarEvents.save(
      CalendarEvent.create({
        id: asEntityId(PLAIN),
        ownerId: asEntityId(OWNER_ID),
        title: 'One-off',
        startsAt: new Date('2026-07-15T09:00:00.000Z'),
        endsAt: new Date('2026-07-15T10:00:00.000Z'),
        now: NOW,
      }),
    )
    await expect(update(OWNER_ID, PLAIN, input)).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })

  it('hides a series owned by someone else', async () => {
    const { update } = await setup()
    await expect(update(OTHER_ID, SERIES, input)).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })

  it('requires a synced (external) series', async () => {
    const { update } = await setup(master(false))
    await expect(update(OWNER_ID, SERIES, input)).rejects.toBeInstanceOf(
      ValidationError,
    )
  })
})
