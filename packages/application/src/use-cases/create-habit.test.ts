import { describe, expect, it } from 'vitest'
import { User, asEntityId, type Plan } from '@lifedeck/domain'
import { makeCreateHabit } from '@/use-cases/create-habit'
import { ForbiddenError } from '@/errors/use-case-error'
import { InMemoryHabitRepository } from '@/testing/in-memory-habit-repository'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { FixedClock, SequentialIdGenerator, ID } from '@/testing/fakes'

const NOW = new Date('2026-07-20T12:00:00.000Z')
const HABIT_A = asEntityId('11111111-1111-4111-8111-111111111111')
const HABIT_B = asEntityId('22222222-2222-4222-8222-222222222222')

async function setup(plan: Plan = 'pro') {
  const habits = new InMemoryHabitRepository()
  const users = new InMemoryUserRepository()
  await users.save(
    User.createGuest({
      id: ID.user,
      displayName: 'Gabriel',
      locale: 'en',
      timezone: 'UTC',
      createdAt: NOW,
    }),
  )
  const createHabit = makeCreateHabit({
    habits,
    users,
    entitlements: { for: async () => ({ plan, entitlements: [] }) },
    ids: new SequentialIdGenerator([HABIT_A, HABIT_B]),
    clock: new FixedClock(NOW),
  })
  return { habits, createHabit }
}

describe('createHabit', () => {
  it('creates a habit and returns a zero-streak view', async () => {
    const { habits, createHabit } = await setup()

    const view = await createHabit(ID.user, {
      title: '  Meditate  ',
      cadence: { kind: 'weekdays', weekdays: [1, 3, 5] },
      checkinHour: 8,
    })

    expect(view.title).toBe('Meditate')
    expect(view.cadence).toEqual({ kind: 'weekdays', weekdays: [1, 3, 5] })
    expect(view.checkinHour).toBe(8)
    expect(view.active).toBe(true)
    expect(view.currentStreak).toBe(0)
    expect(view.doneToday).toBe(false)
    expect(view.scheduledToday).toBe(true) // 2026-07-20 is a Monday
    expect(await habits.countByOwner(ID.user)).toBe(1)
  })

  it('lets a free user create their first habit but not a second', async () => {
    const { createHabit } = await setup('free')

    await createHabit(ID.user, { title: 'Read', cadence: { kind: 'daily' } })

    await expect(
      createHabit(ID.user, { title: 'Run', cadence: { kind: 'daily' } }),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('lets a paid user create more than one habit', async () => {
    const { createHabit } = await setup('pro')

    await createHabit(ID.user, { title: 'Read', cadence: { kind: 'daily' } })
    const second = await createHabit(ID.user, {
      title: 'Run',
      cadence: { kind: 'times_per_week', count: 3 },
    })

    expect(second.title).toBe('Run')
  })

  it('rejects an empty title', async () => {
    const { createHabit } = await setup()
    await expect(
      createHabit(ID.user, { title: '   ', cadence: { kind: 'daily' } }),
    ).rejects.toThrow()
  })
})
