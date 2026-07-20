import { describe, expect, it } from 'vitest'
import { Habit, HabitLog, User, asEntityId } from '@lifedeck/domain'
import { makeUpdateHabit } from '@/use-cases/update-habit'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryHabitRepository } from '@/testing/in-memory-habit-repository'
import { InMemoryHabitLogRepository } from '@/testing/in-memory-habit-log-repository'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { FixedClock, ID } from '@/testing/fakes'

const NOW = new Date('2026-07-20T12:00:00.000Z')
const HABIT = asEntityId('11111111-1111-4111-8111-111111111111')
const LOG_A = asEntityId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
const LOG_B = asEntityId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')

async function setup(ownerId = ID.user) {
  const habits = new InMemoryHabitRepository()
  const habitLogs = new InMemoryHabitLogRepository()
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
  await habits.save(
    Habit.create({
      id: HABIT,
      ownerId,
      title: 'Meditate',
      cadence: { kind: 'daily' },
      createdAt: NOW,
    }),
  )
  const updateHabit = makeUpdateHabit({
    habits,
    habitLogs,
    users,
    clock: new FixedClock(NOW),
  })
  return { habits, habitLogs, updateHabit }
}

describe('updateHabit', () => {
  it('renames, re-cadences, and sets the check-in hour', async () => {
    const { updateHabit } = await setup()

    const view = await updateHabit(ID.user, HABIT, {
      title: 'Deep work',
      cadence: { kind: 'times_per_week', count: 4 },
      checkinHour: 9,
    })

    expect(view.title).toBe('Deep work')
    expect(view.cadence).toEqual({ kind: 'times_per_week', count: 4 })
    expect(view.checkinHour).toBe(9)
  })

  it('pauses a habit and clears the check-in hour', async () => {
    const { updateHabit } = await setup()
    await updateHabit(ID.user, HABIT, { checkinHour: 8 })

    const view = await updateHabit(ID.user, HABIT, {
      active: false,
      checkinHour: null,
    })

    expect(view.active).toBe(false)
    expect(view.checkinHour).toBeNull()
  })

  it('recomputes the streak from existing logs', async () => {
    const { habitLogs, updateHabit } = await setup()
    await habitLogs.save(
      HabitLog.create({
        id: LOG_A,
        habitId: HABIT,
        date: '2026-07-20',
        createdAt: NOW,
      }),
    )
    await habitLogs.save(
      HabitLog.create({
        id: LOG_B,
        habitId: HABIT,
        date: '2026-07-19',
        createdAt: NOW,
      }),
    )

    const view = await updateHabit(ID.user, HABIT, { title: 'Meditate daily' })

    expect(view.currentStreak).toBe(2)
    expect(view.doneToday).toBe(true)
  })

  it('rejects an unknown habit', async () => {
    const { updateHabit } = await setup()
    await expect(
      updateHabit(ID.user, asEntityId('00000000-0000-4000-8000-000000000000'), {
        title: 'x',
      }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('rejects a habit owned by someone else', async () => {
    const { updateHabit } = await setup(ID.otherUser)
    await expect(
      updateHabit(ID.user, HABIT, { title: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})
