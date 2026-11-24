import { MESSAGE_LANGUAGES } from '@lifedeck/domain'
import { describe, expect, it } from 'vitest'
import {
  composeDailyBrief,
  composeDailyBriefParam,
  type DailyBriefData,
} from '@/shared/daily-brief-text'
import { composeHabitCheckin } from '@/shared/habit-checkin-text'
import { composeNudge, nudgeButtonLabels } from '@/shared/nudge-text'
import { pushTitles } from '@/shared/push-text'

const busyDay = (count: number): DailyBriefData => ({
  dateLabel: '20/07',
  pendingTitles: Array.from({ length: count * 6 }, (_, i) => `Task ${i}`),
  doneCount: 1,
  totalCount: count * 6 + 1,
  carriedOver: count,
  events: Array.from({ length: count }, (_, i) => ({
    time: '09:00',
    title: `Event ${i}`,
  })),
  weather: {
    location: 'Paris',
    tempMinC: 12,
    tempMaxC: 20,
    precipitationProbabilityPct: 30,
  },
})

const emptyDay: DailyBriefData = {
  ...busyDay(1),
  pendingTitles: [],
  events: [],
  carriedOver: 0,
  weather: null,
}

// Every language carries the same copy shape; this renders each phrase once so
// a missing or broken translation shows up as a failure, not a blank.
describe.each(MESSAGE_LANGUAGES)('copy in %s', language => {
  it('renders the daily brief for busy, single and empty days', () => {
    for (const day of [busyDay(1), busyDay(2), emptyDay]) {
      expect(composeDailyBrief(language, day)).toContain('20/07')
      expect(composeDailyBriefParam(language, day)).not.toContain('\n')
    }
    expect(
      composeDailyBriefParam(language, { ...emptyDay, doneCount: 0 }),
    ).toContain('20/07')
    expect(
      composeDailyBrief(language, { ...emptyDay, totalCount: 2, doneCount: 2 }),
    ).toContain('20/07')
  })

  it('renders nudges, check-ins and push titles', () => {
    expect(composeNudge(language, { taskTitle: 'Gym', days: 3 })).toContain(
      'Gym',
    )
    expect(nudgeButtonLabels(language).yes).not.toBe('')
    expect(composeHabitCheckin(language, 'Run', 8)).toContain('Run')
    expect(composeHabitCheckin(language, 'Run', 20)).toContain('Run')
    expect(Object.values(pushTitles(language)).every(Boolean)).toBe(true)
  })
})
