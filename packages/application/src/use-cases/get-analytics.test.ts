import { describe, expect, it } from 'vitest'
import { Habit, HabitLog, User, asEntityId } from '@lifedeck/domain'
import type { HabitCadence } from '@lifedeck/domain'
import { makeGetAnalytics } from '@/use-cases/get-analytics'
import { FakeAnalyticsRepository } from '@/testing/fake-analytics-repository'
import { InMemoryHabitRepository } from '@/testing/in-memory-habit-repository'
import { InMemoryHabitLogRepository } from '@/testing/in-memory-habit-log-repository'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { FixedClock, ID } from '@/testing/fakes'

const NOW = new Date('2026-06-22T15:00:00.000Z')
const EARLY = new Date('2026-01-01T00:00:00.000Z')

function build(
  rows: { date: string; total: number; completed: number }[] = [],
  totals = { total: 0, completed: 0 },
  timezone?: string,
) {
  const analytics = new FakeAnalyticsRepository(rows, totals)
  const users = new InMemoryUserRepository()
  if (timezone) {
    void users.save(
      User.createGuest({
        id: ID.user,
        displayName: 'Gabriel',
        locale: 'en',
        timezone,
        createdAt: NOW,
      }),
    )
  }
  return makeGetAnalytics({
    analytics,
    habits: new InMemoryHabitRepository(),
    habitLogs: new InMemoryHabitLogRepository(),
    users,
    clock: new FixedClock(NOW),
  })
}

let habitCounter = 0

async function buildWithHabits(
  seeds: {
    cadence: HabitCadence
    active?: boolean
    dates: string[]
    createdAt?: Date
  }[],
) {
  const habits = new InMemoryHabitRepository()
  const habitLogs = new InMemoryHabitLogRepository()
  for (const seed of seeds) {
    habitCounter += 1
    const id = asEntityId(
      `00000000-0000-4000-8000-${String(habitCounter).padStart(12, '0')}`,
    )
    const habit = Habit.create({
      id,
      ownerId: asEntityId(ID.user),
      title: `Habit ${habitCounter}`,
      cadence: seed.cadence,
      createdAt: seed.createdAt ?? EARLY,
    })
    if (seed.active === false) {
      habit.setActive(false)
    }
    await habits.save(habit)
    for (const date of seed.dates) {
      habitCounter += 1
      await habitLogs.save(
        HabitLog.create({
          id: asEntityId(
            `11111111-0000-4000-8000-${String(habitCounter).padStart(12, '0')}`,
          ),
          habitId: id,
          date,
          createdAt: NOW,
        }),
      )
    }
  }
  return makeGetAnalytics({
    analytics: new FakeAnalyticsRepository([], { total: 0, completed: 0 }),
    habits,
    habitLogs,
    users: new InMemoryUserRepository(),
    clock: new FixedClock(NOW),
  })
}

describe('getAnalytics', () => {
  it('returns a continuous day series ending today, filling gaps with zero', async () => {
    const getAnalytics = build([{ date: '2026-06-20', total: 4, completed: 3 }])
    const view = await getAnalytics(ID.user, { days: 7 })

    expect(view.days).toHaveLength(7)
    expect(view.from).toBe('2026-06-16')
    expect(view.to).toBe('2026-06-22')
    expect(view.days[4]).toEqual({ date: '2026-06-20', total: 4, completed: 3 })
    expect(view.days[5]).toEqual({ date: '2026-06-21', total: 0, completed: 0 })
  })

  it('computes the completion rate from the totals', async () => {
    const getAnalytics = build([], { total: 8, completed: 6 })
    const view = await getAnalytics(ID.user)
    expect(view.totalTasks).toBe(8)
    expect(view.totalCompleted).toBe(6)
    expect(view.completionRate).toBeCloseTo(0.75)
  })

  it('reports a zero completion rate when there are no tasks', async () => {
    const view = await build()(ID.user)
    expect(view.completionRate).toBe(0)
  })

  it('counts the current streak of trailing days with completions', async () => {
    const getAnalytics = build([
      { date: '2026-06-20', total: 1, completed: 1 },
      { date: '2026-06-21', total: 2, completed: 2 },
      { date: '2026-06-22', total: 1, completed: 1 },
    ])
    const view = await getAnalytics(ID.user, { days: 7 })
    expect(view.currentStreak).toBe(3)
  })

  it('breaks the streak when today has no completions', async () => {
    const getAnalytics = build([{ date: '2026-06-21', total: 5, completed: 5 }])
    const view = await getAnalytics(ID.user, { days: 7 })
    expect(view.currentStreak).toBe(0)
  })

  it('clamps the requested window to at least one day', async () => {
    const view = await build()(ID.user, { days: 0 })
    expect(view.days).toHaveLength(1)
    expect(view.days[0]?.date).toBe('2026-06-22')
  })

  it('clamps the requested window to the supported maximum', async () => {
    const view = await build()(ID.user, { days: 10_000 })
    expect(view.days).toHaveLength(3660)
  })

  it('fills the per-day totals so a period rate can be derived', async () => {
    const getAnalytics = build([
      { date: '2026-06-21', total: 3, completed: 2 },
      { date: '2026-06-22', total: 2, completed: 0 },
    ])
    const view = await getAnalytics(ID.user, { days: 7 })
    expect(view.days.at(-1)).toEqual({
      date: '2026-06-22',
      total: 2,
      completed: 0,
    })
    expect(view.days.at(-2)).toEqual({
      date: '2026-06-21',
      total: 3,
      completed: 2,
    })
  })

  it("anchors the series on the user's local civil day", async () => {
    // 2026-06-22T15:00Z is already 2026-06-23 in UTC+14
    const view = await build(
      [],
      { total: 0, completed: 0 },
      'Pacific/Kiritimati',
    )(ID.user, { days: 7 })
    expect(view.to).toBe('2026-06-23')
    expect(view.from).toBe('2026-06-17')
    expect(view.days.at(-1)?.date).toBe('2026-06-23')
  })

  it('reports empty habit analytics when there are no habits', async () => {
    const view = await build()(ID.user, { days: 7 })
    expect(view.habits).toEqual({
      active: 0,
      completions: 0,
      bestStreak: 0,
      consistency: 0,
      items: [],
    })
  })

  it('summarizes a daily habit over the window', async () => {
    const getAnalytics = await buildWithHabits([
      {
        cadence: { kind: 'daily' },
        dates: ['2026-06-20', '2026-06-21', '2026-06-22'],
      },
    ])
    const view = await getAnalytics(ID.user, { days: 7 })

    expect(view.habits.active).toBe(1)
    expect(view.habits.completions).toBe(3)
    expect(view.habits.bestStreak).toBe(3)
    // 7-day window, all days expected; 3 of 7 done.
    expect(view.habits.items[0]?.expected).toBe(7)
    expect(view.habits.consistency).toBeCloseTo(3 / 7)
  })

  it('excludes paused habits and ranks by streak', async () => {
    const getAnalytics = await buildWithHabits([
      { cadence: { kind: 'daily' }, dates: ['2026-06-22'] },
      {
        cadence: { kind: 'daily' },
        dates: ['2026-06-20', '2026-06-21', '2026-06-22'],
      },
      { cadence: { kind: 'daily' }, active: false, dates: ['2026-06-22'] },
    ])
    const view = await getAnalytics(ID.user, { days: 7 })

    expect(view.habits.active).toBe(2)
    expect(view.habits.items.map(item => item.currentStreak)).toEqual([3, 1])
  })

  it('counts completions only within the window but streaks beyond it', async () => {
    const getAnalytics = await buildWithHabits([
      {
        cadence: { kind: 'daily' },
        // An unbroken run 2026-06-10..2026-06-22 (13 days), reaching back before
        // the 7-day window and up to today.
        dates: Array.from({ length: 13 }, (_, index) => {
          const day = 10 + index
          return `2026-06-${String(day).padStart(2, '0')}`
        }),
      },
    ])
    const view = await getAnalytics(ID.user, { days: 7 })

    // Window is 2026-06-16..2026-06-22 (7 days), all completed.
    expect(view.habits.completions).toBe(7)
    // Streak counts the unbroken run through today, past the window edge.
    expect(view.habits.bestStreak).toBe(13)
  })
})
