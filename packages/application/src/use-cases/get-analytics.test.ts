import { describe, expect, it } from 'vitest'
import { makeGetAnalytics } from '@/use-cases/get-analytics'
import { FakeAnalyticsRepository } from '@/testing/fake-analytics-repository'
import { FixedClock, ID } from '@/testing/fakes'

const NOW = new Date('2026-06-22T15:00:00.000Z')

function build(
  rows: { date: string; completed: number }[] = [],
  totals = { total: 0, completed: 0 },
) {
  const analytics = new FakeAnalyticsRepository(rows, totals)
  return makeGetAnalytics({ analytics, clock: new FixedClock(NOW) })
}

describe('getAnalytics', () => {
  it('returns a continuous day series ending today, filling gaps with zero', async () => {
    const getAnalytics = build([{ date: '2026-06-20', completed: 3 }])
    const view = await getAnalytics(ID.user, { days: 7 })

    expect(view.days).toHaveLength(7)
    expect(view.from).toBe('2026-06-16')
    expect(view.to).toBe('2026-06-22')
    expect(view.days[4]).toEqual({ date: '2026-06-20', completed: 3 })
    expect(view.days[5]).toEqual({ date: '2026-06-21', completed: 0 })
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
      { date: '2026-06-20', completed: 1 },
      { date: '2026-06-21', completed: 2 },
      { date: '2026-06-22', completed: 1 },
    ])
    const view = await getAnalytics(ID.user, { days: 7 })
    expect(view.currentStreak).toBe(3)
  })

  it('breaks the streak when today has no completions', async () => {
    const getAnalytics = build([{ date: '2026-06-21', completed: 5 }])
    const view = await getAnalytics(ID.user, { days: 7 })
    expect(view.currentStreak).toBe(0)
  })

  it('clamps the requested window to at least one day', async () => {
    const view = await build()(ID.user, { days: 0 })
    expect(view.days).toHaveLength(1)
    expect(view.days[0]?.date).toBe('2026-06-22')
  })

  it('clamps the requested window to at most a year', async () => {
    const view = await build()(ID.user, { days: 10_000 })
    expect(view.days).toHaveLength(365)
  })
})
