import { describe, expect, it, vi } from 'vitest'
import { CalendarEvent, ValidationError, asEntityId } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryCalendarEventRepository } from '@/testing/in-memory-calendar-event-repository'
import { makeDeleteCalendarOccurrence } from '@/use-cases/delete-calendar-occurrence'

const NOW = new Date('2026-06-24T10:00:00.000Z')
const LATER = new Date('2026-07-14T10:00:00.000Z')
const OWNER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'
const OTHER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const SERIES = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
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
  const remove = makeDeleteCalendarOccurrence({
    calendarEvents,
    jobQueue: { enqueue },
    ids: { generate: () => asEntityId('99999999-9999-4999-8999-999999999991') },
    clock: { now: () => LATER },
  })
  return { calendarEvents, remove, enqueue }
}

describe('deleteCalendarOccurrence', () => {
  it('stores a cancelled override and enqueues a push', async () => {
    const { remove, calendarEvents, enqueue } = await setup()
    await remove(OWNER_ID, SERIES, OCC)

    const stored = await calendarEvents.findOverrideByOriginalStart(
      asEntityId(OWNER_ID),
      MASTER_EXT,
      new Date(OCC),
    )
    expect(stored?.cancelled).toBe(true)
    expect(stored?.startsAt.toISOString()).toBe(OCC)
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'calendar-push' }),
    )
  })

  it('cancels an existing override in place', async () => {
    const { remove, calendarEvents } = await setup()
    await calendarEvents.save(
      CalendarEvent.create({
        id: asEntityId('11111111-1111-4111-8111-111111111111'),
        ownerId: asEntityId(OWNER_ID),
        title: 'English (moved)',
        startsAt: new Date('2026-07-15T19:00:00.000Z'),
        endsAt: new Date('2026-07-15T19:50:00.000Z'),
        recurrenceMasterExternalId: MASTER_EXT,
        originalStartsAt: new Date(OCC),
        source: 'google',
        externalId: `${MASTER_EXT}_${OCC}`,
        now: NOW,
      }),
    )
    await remove(OWNER_ID, SERIES, OCC)

    const overrides = await calendarEvents.listOverridesByMasterExternalIds(
      asEntityId(OWNER_ID),
      [MASTER_EXT],
    )
    expect(overrides).toHaveLength(1)
    expect(overrides[0]?.cancelled).toBe(true)
  })

  it('rejects an unknown series', async () => {
    const { remove } = await setup()
    await expect(
      remove(OWNER_ID, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', OCC),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('hides a series owned by someone else', async () => {
    const { remove } = await setup()
    await expect(remove(OTHER_ID, SERIES, OCC)).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })

  it('requires a synced (external) series', async () => {
    const { remove } = await setup(master(false))
    await expect(remove(OWNER_ID, SERIES, OCC)).rejects.toBeInstanceOf(
      ValidationError,
    )
  })
})
