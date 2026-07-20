import { describe, expect, it } from 'vitest'
import { Habit, HabitLog, User, asEntityId } from '@lifedeck/domain'
import { makeListHabits } from '@/use-cases/list-habits'
import { InMemoryHabitRepository } from '@/testing/in-memory-habit-repository'
import { InMemoryHabitLogRepository } from '@/testing/in-memory-habit-log-repository'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { FixedClock, ID } from '@/testing/fakes'

const NOW = new Date('2026-07-20T12:00:00.000Z')
const HABIT_A = asEntityId('11111111-1111-4111-8111-111111111111')
const HABIT_B = asEntityId('22222222-2222-4222-8222-222222222222')

async function setup() {
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
  const listHabits = makeListHabits({
    habits,
    habitLogs,
    users,
    clock: new FixedClock(NOW),
  })
  return { habits, habitLogs, listHabits }
}

describe('listHabits', () => {
  it('returns an empty list when the user has no habits', async () => {
    const { listHabits } = await setup()
    expect(await listHabits(ID.user)).toEqual([])
  })

  it('falls back to UTC today when the user record is missing', async () => {
    const habits = new InMemoryHabitRepository()
    const habitLogs = new InMemoryHabitLogRepository()
    const users = new InMemoryUserRepository()
    await habits.save(
      Habit.create({
        id: HABIT_A,
        ownerId: ID.user,
        title: 'Meditate',
        cadence: { kind: 'daily' },
        createdAt: NOW,
      }),
    )
    await habitLogs.save(
      HabitLog.create({
        id: asEntityId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
        habitId: HABIT_A,
        date: '2026-07-20', // UTC "today" for NOW
        createdAt: NOW,
      }),
    )
    const listHabits = makeListHabits({
      habits,
      habitLogs,
      users,
      clock: new FixedClock(NOW),
    })

    const [view] = await listHabits(ID.user)

    expect(view?.doneToday).toBe(true)
  })

  it('returns each habit with its streak and today facts', async () => {
    const { habits, habitLogs, listHabits } = await setup()
    // First created: a daily habit done today and yesterday (streak 2).
    await habits.save(
      Habit.create({
        id: HABIT_A,
        ownerId: ID.user,
        title: 'Meditate',
        cadence: { kind: 'daily' },
        createdAt: new Date('2026-07-01T10:00:00.000Z'),
      }),
    )
    await habitLogs.save(
      HabitLog.create({
        id: asEntityId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
        habitId: HABIT_A,
        date: '2026-07-20',
        createdAt: NOW,
      }),
    )
    await habitLogs.save(
      HabitLog.create({
        id: asEntityId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
        habitId: HABIT_A,
        date: '2026-07-19',
        createdAt: NOW,
      }),
    )
    // Second created: a Tue/Thu habit with no logs, not scheduled on a Monday.
    await habits.save(
      Habit.create({
        id: HABIT_B,
        ownerId: ID.user,
        title: 'Gym',
        cadence: { kind: 'weekdays', weekdays: [2, 4] },
        createdAt: new Date('2026-07-02T10:00:00.000Z'),
      }),
    )

    const views = await listHabits(ID.user)

    expect(views.map(view => view.title)).toEqual(['Meditate', 'Gym'])
    expect(views[0]).toMatchObject({
      currentStreak: 2,
      doneToday: true,
      scheduledToday: true,
    })
    expect(views[1]).toMatchObject({
      currentStreak: 0,
      doneToday: false,
      scheduledToday: false, // 2026-07-20 is a Monday
    })
  })
})
