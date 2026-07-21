import { describe, expect, it, vi } from 'vitest'
import { User } from '@lifedeck/domain'
import { makeFindFreeSlots } from '@/use-cases/find-free-slots'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { FixedClock, ID } from '@/testing/fakes'
import type { makeListCalendarEvents } from '@/use-cases/list-calendar-events'

type BusyEvent = { startsAt: string; endsAt: string; allDay: boolean }

// The use case only reads startsAt/endsAt/allDay off each event.
function fakeList(
  events: BusyEvent[] = [],
): ReturnType<typeof makeListCalendarEvents> {
  return (async () => events) as unknown as ReturnType<
    typeof makeListCalendarEvents
  >
}

const NOW = new Date('2026-07-20T06:00:00.000Z') // Mon, 06:00 UTC

type ProfilePatch = Parameters<User['updateProfile']>[0]

async function setup(options?: {
  timezone?: string
  profile?: ProfilePatch
  events?: BusyEvent[]
  now?: Date
  listSpy?: ReturnType<typeof makeListCalendarEvents>
}) {
  const users = new InMemoryUserRepository()
  const user = User.createGuest({
    id: ID.user,
    displayName: 'Gabriel',
    locale: 'en',
    timezone: options?.timezone ?? 'UTC',
    createdAt: NOW,
  })
  if (options?.profile) {
    user.updateProfile(options.profile)
  }
  await users.save(user)

  const findFreeSlots = makeFindFreeSlots({
    users,
    listCalendarEvents: options?.listSpy ?? fakeList(options?.events),
    clock: new FixedClock(options?.now ?? NOW),
  })
  return { findFreeSlots }
}

// UTC HH:MM of each returned slot start (the user sits in UTC unless noted).
const startHours = (slots: { startsAt: string }[]): string[] =>
  slots.map(slot => slot.startsAt.slice(11, 16))

const DAY = { from: '2026-07-20T00:00:00.000Z', to: '2026-07-20T23:59:00.000Z' }

describe('findFreeSlots', () => {
  it('offers hourly slots across the default 09-18 work day', async () => {
    const { findFreeSlots } = await setup()
    const slots = await findFreeSlots(ID.user, {
      durationMin: 60,
      granularityMin: 60,
      maxResults: 20,
      ...DAY,
    })
    expect(startHours(slots)).toEqual([
      '09:00',
      '10:00',
      '11:00',
      '12:00',
      '13:00',
      '14:00',
      '15:00',
      '16:00',
      '17:00',
    ])
  })

  it('splits the day around a busy event', async () => {
    const { findFreeSlots } = await setup({
      events: [
        {
          startsAt: '2026-07-20T12:00:00.000Z',
          endsAt: '2026-07-20T13:00:00.000Z',
          allDay: false,
        },
      ],
    })
    const slots = await findFreeSlots(ID.user, {
      durationMin: 60,
      granularityMin: 60,
      maxResults: 20,
      ...DAY,
    })
    expect(startHours(slots)).not.toContain('12:00')
    expect(startHours(slots)).toContain('11:00')
    expect(startHours(slots)).toContain('13:00')
  })

  it('excludes quiet hours from the work window', async () => {
    const { findFreeSlots } = await setup({
      profile: { quietHoursStart: 0, quietHoursEnd: 10 },
    })
    const slots = await findFreeSlots(ID.user, {
      durationMin: 60,
      granularityMin: 60,
      ...DAY,
    })
    expect(startHours(slots)[0]).toBe('10:00')
    expect(startHours(slots)).not.toContain('09:00')
  })

  it('does not treat all-day events as busy', async () => {
    const { findFreeSlots } = await setup({
      events: [
        {
          startsAt: '2026-07-20T00:00:00.000Z',
          endsAt: '2026-07-21T00:00:00.000Z',
          allDay: true,
        },
      ],
    })
    const slots = await findFreeSlots(ID.user, {
      durationMin: 60,
      granularityMin: 60,
      ...DAY,
    })
    expect(startHours(slots)).toContain('09:00')
  })

  it('returns nothing when no gap fits the duration', async () => {
    const { findFreeSlots } = await setup({
      events: [
        {
          startsAt: '2026-07-20T09:30:00.000Z',
          endsAt: '2026-07-20T10:30:00.000Z',
          allDay: false,
        },
      ],
    })
    const slots = await findFreeSlots(ID.user, {
      durationMin: 60,
      workDayStart: 9,
      workDayEnd: 11,
      ...DAY,
    })
    expect(slots).toEqual([])
  })

  it('caps the results at maxResults', async () => {
    const { findFreeSlots } = await setup()
    const slots = await findFreeSlots(ID.user, {
      durationMin: 30,
      granularityMin: 30,
      maxResults: 3,
      ...DAY,
    })
    expect(slots).toHaveLength(3)
  })

  it('uses the profile work hours, and lets the request override them', async () => {
    const withProfile = await setup({
      profile: { workHoursStart: 14, workHoursEnd: 17 },
    })
    const fromProfile = await withProfile.findFreeSlots(ID.user, {
      durationMin: 60,
      granularityMin: 60,
      ...DAY,
    })
    expect(startHours(fromProfile)).toEqual(['14:00', '15:00', '16:00'])

    const overridden = await withProfile.findFreeSlots(ID.user, {
      durationMin: 60,
      granularityMin: 60,
      workDayStart: 9,
      workDayEnd: 12,
      ...DAY,
    })
    expect(startHours(overridden)).toEqual(['09:00', '10:00', '11:00'])
  })

  it('never proposes a slot in the past', async () => {
    const { findFreeSlots } = await setup({
      now: new Date('2026-07-20T10:30:00.000Z'),
    })
    const slots = await findFreeSlots(ID.user, {
      durationMin: 60,
      granularityMin: 60,
      ...DAY,
    })
    expect(startHours(slots)[0]).toBe('11:00')
    expect(startHours(slots)).not.toContain('09:00')
  })

  it('spans multiple civil days', async () => {
    const { findFreeSlots } = await setup()
    const slots = await findFreeSlots(ID.user, {
      durationMin: 60,
      granularityMin: 60,
      maxResults: 50,
      from: '2026-07-20T00:00:00.000Z',
      to: '2026-07-21T23:59:00.000Z',
    })
    expect(slots.some(slot => slot.startsAt.startsWith('2026-07-21'))).toBe(
      true,
    )
  })

  it('resolves work hours in the user timezone', async () => {
    const { findFreeSlots } = await setup({
      timezone: 'America/Sao_Paulo',
      now: new Date('2026-07-20T09:00:00.000Z'), // 06:00 in Sao Paulo
    })
    const slots = await findFreeSlots(ID.user, {
      durationMin: 60,
      granularityMin: 60,
      from: '2026-07-20T03:00:00.000Z',
      to: '2026-07-20T23:00:00.000Z',
    })
    // 09:00 in Sao Paulo (UTC-3) is 12:00 UTC.
    expect(slots[0]?.startsAt).toBe('2026-07-20T12:00:00.000Z')
  })

  it('clamps the scan (and events query) to the max range', async () => {
    const listSpy = vi.fn().mockResolvedValue([])
    const { findFreeSlots } = await setup({
      listSpy: listSpy as unknown as ReturnType<typeof makeListCalendarEvents>,
    })
    await findFreeSlots(ID.user, {
      durationMin: 60,
      from: '2026-07-20T00:00:00.000Z',
      to: '2026-12-31T00:00:00.000Z', // far past the 31-day cap
    })
    const [, query] = listSpy.mock.calls[0]!
    const spannedDays =
      (Date.parse(query.to) - Date.parse(query.from)) / (24 * 60 * 60 * 1000)
    expect(spannedDays).toBeLessThanOrEqual(31)
  })

  it('excludes a quiet window that wraps past midnight', async () => {
    const { findFreeSlots } = await setup({
      profile: { quietHoursStart: 22, quietHoursEnd: 10 },
    })
    const slots = await findFreeSlots(ID.user, {
      durationMin: 60,
      granularityMin: 60,
      ...DAY,
    })
    // The morning head of the quiet window (up to 10:00) clips the 09:00 slot.
    expect(startHours(slots)[0]).toBe('10:00')
    expect(startHours(slots)).not.toContain('09:00')
  })

  it('returns nothing when quiet hours cover the whole work window', async () => {
    const { findFreeSlots } = await setup({
      profile: { quietHoursStart: 8, quietHoursEnd: 19 }, // engulfs 09-18
    })
    expect(await findFreeSlots(ID.user, { durationMin: 30, ...DAY })).toEqual(
      [],
    )
  })

  it('returns nothing when the whole window is already in the past', async () => {
    const { findFreeSlots } = await setup({
      now: new Date('2026-07-21T00:00:00.000Z'), // after the requested day
    })
    expect(await findFreeSlots(ID.user, { durationMin: 60, ...DAY })).toEqual(
      [],
    )
  })

  it('returns nothing for a degenerate work window', async () => {
    const { findFreeSlots } = await setup()
    const slots = await findFreeSlots(ID.user, {
      durationMin: 60,
      workDayStart: 18,
      workDayEnd: 9,
      ...DAY,
    })
    expect(slots).toEqual([])
  })

  it('throws when the user does not exist', async () => {
    const { findFreeSlots } = await setup()
    await expect(
      findFreeSlots('00000000-0000-4000-8000-000000000000', {
        durationMin: 60,
        ...DAY,
      }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})
