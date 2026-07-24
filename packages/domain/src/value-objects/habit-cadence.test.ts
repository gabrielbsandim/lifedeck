import { describe, expect, it } from 'vitest'
import { ValidationError } from '@/shared/domain-error'
import {
  computeHabitStreak,
  expectedHabitCompletions,
  isHabitScheduledOn,
  validateHabitCadence,
  weekdayOfCivilDate,
  type HabitCadence,
} from '@/value-objects/habit-cadence'

// Anchor week: Mon 2026-07-13 .. Sun 2026-07-19; Mon 2026-07-20 starts the next.
// Prior week: Mon 2026-07-06 .. Sun 2026-07-12.

describe('validateHabitCadence', () => {
  it('accepts a daily cadence', () => {
    expect(validateHabitCadence({ kind: 'daily' })).toEqual({ kind: 'daily' })
  })

  it('sorts and de-duplicates weekdays', () => {
    expect(
      validateHabitCadence({ kind: 'weekdays', weekdays: [5, 1, 3, 1] }),
    ).toEqual({ kind: 'weekdays', weekdays: [1, 3, 5] })
  })

  it('rejects an empty weekdays list', () => {
    expect(() =>
      validateHabitCadence({ kind: 'weekdays', weekdays: [] }),
    ).toThrow(ValidationError)
  })

  it('rejects a weekday out of the 0-6 range', () => {
    expect(() =>
      validateHabitCadence({ kind: 'weekdays', weekdays: [7] }),
    ).toThrow(ValidationError)
  })

  it('accepts a times_per_week count in range', () => {
    expect(validateHabitCadence({ kind: 'times_per_week', count: 3 })).toEqual({
      kind: 'times_per_week',
      count: 3,
    })
  })

  it('rejects a times_per_week count below 1 or above 7', () => {
    expect(() =>
      validateHabitCadence({ kind: 'times_per_week', count: 0 }),
    ).toThrow(ValidationError)
    expect(() =>
      validateHabitCadence({ kind: 'times_per_week', count: 8 }),
    ).toThrow(ValidationError)
  })

  it('rejects an unknown cadence kind', () => {
    expect(() =>
      validateHabitCadence({ kind: 'yearly' } as unknown as HabitCadence),
    ).toThrow(ValidationError)
  })
})

describe('weekdayOfCivilDate', () => {
  it('returns the UTC weekday of a civil date', () => {
    expect(weekdayOfCivilDate('2026-07-19')).toBe(0) // Sunday
    expect(weekdayOfCivilDate('2026-07-20')).toBe(1) // Monday
    expect(weekdayOfCivilDate('2026-07-18')).toBe(6) // Saturday
  })

  it('rejects a malformed date', () => {
    expect(() => weekdayOfCivilDate('2026/07/20')).toThrow(ValidationError)
  })
})

describe('isHabitScheduledOn', () => {
  it('schedules a daily habit on every day', () => {
    expect(isHabitScheduledOn({ kind: 'daily' }, '2026-07-19')).toBe(true)
  })

  it('schedules a weekdays habit only on its listed days', () => {
    const cadence: HabitCadence = { kind: 'weekdays', weekdays: [1, 3, 5] }
    expect(isHabitScheduledOn(cadence, '2026-07-20')).toBe(true) // Monday
    expect(isHabitScheduledOn(cadence, '2026-07-19')).toBe(false) // Sunday
  })

  it('schedules a times_per_week habit on any day', () => {
    expect(
      isHabitScheduledOn({ kind: 'times_per_week', count: 3 }, '2026-07-19'),
    ).toBe(true)
  })
})

describe('computeHabitStreak', () => {
  it('returns 0 when nothing has been logged', () => {
    expect(computeHabitStreak({ kind: 'daily' }, [], '2026-07-20')).toBe(0)
  })

  describe('daily', () => {
    const daily: HabitCadence = { kind: 'daily' }

    it('counts consecutive days including today', () => {
      expect(
        computeHabitStreak(
          daily,
          ['2026-07-20', '2026-07-19', '2026-07-18'],
          '2026-07-20',
        ),
      ).toBe(3)
    })

    it('gives today grace when it is not done yet', () => {
      expect(
        computeHabitStreak(daily, ['2026-07-19', '2026-07-18'], '2026-07-20'),
      ).toBe(2)
    })

    it('breaks the streak at the first missed day', () => {
      expect(
        computeHabitStreak(daily, ['2026-07-20', '2026-07-18'], '2026-07-20'),
      ).toBe(1)
    })
  })

  describe('weekdays', () => {
    const mwf: HabitCadence = { kind: 'weekdays', weekdays: [1, 3, 5] }

    it('counts scheduled days and skips the days off', () => {
      expect(
        computeHabitStreak(
          mwf,
          ['2026-07-20', '2026-07-17', '2026-07-15', '2026-07-13'],
          '2026-07-20',
        ),
      ).toBe(4)
    })

    it('gives a scheduled today grace when not done yet', () => {
      expect(
        computeHabitStreak(mwf, ['2026-07-17', '2026-07-15'], '2026-07-20'),
      ).toBe(2)
    })

    it('breaks at a missed scheduled day', () => {
      expect(computeHabitStreak(mwf, ['2026-07-20'], '2026-07-20')).toBe(1)
    })

    it('counts back from a non-scheduled today', () => {
      expect(
        computeHabitStreak(
          mwf,
          ['2026-07-17', '2026-07-15', '2026-07-13'],
          '2026-07-19',
        ),
      ).toBe(3)
    })
  })

  describe('times_per_week', () => {
    const thrice: HabitCadence = { kind: 'times_per_week', count: 3 }

    it('counts a satisfied prior week when this week is not yet met', () => {
      expect(
        computeHabitStreak(
          thrice,
          ['2026-07-20', '2026-07-17', '2026-07-15', '2026-07-13'],
          '2026-07-20',
        ),
      ).toBe(1)
    })

    it('counts consecutive satisfied weeks, including a met current week', () => {
      expect(
        computeHabitStreak(
          thrice,
          [
            '2026-07-19',
            '2026-07-17',
            '2026-07-15',
            '2026-07-13',
            '2026-07-08',
            '2026-07-07',
            '2026-07-06',
          ],
          '2026-07-19',
        ),
      ).toBe(2)
    })

    it('returns 0 when no week reaches the target', () => {
      expect(computeHabitStreak(thrice, ['2026-07-20'], '2026-07-20')).toBe(0)
    })

    it('breaks on a gap week that has no logs at all', () => {
      // Week of 07-13 is met; the week of 07-06 is empty; an older log in the
      // week of 06-29 keeps the walk going far enough to see the gap.
      expect(
        computeHabitStreak(
          thrice,
          ['2026-07-17', '2026-07-15', '2026-07-13', '2026-06-29'],
          '2026-07-19',
        ),
      ).toBe(1)
    })
  })

  describe('expectedHabitCompletions', () => {
    it('counts every day for a daily cadence', () => {
      // 2026-07-13 .. 2026-07-19 inclusive is 7 days.
      expect(
        expectedHabitCompletions({ kind: 'daily' }, '2026-07-13', '2026-07-19'),
      ).toBe(7)
    })

    it('counts only the listed weekdays', () => {
      // Mon (1) and Wed (3) over the week 07-13..07-19: 07-13 and 07-15.
      expect(
        expectedHabitCompletions(
          { kind: 'weekdays', weekdays: [1, 3] },
          '2026-07-13',
          '2026-07-19',
        ),
      ).toBe(2)
    })

    it('prorates times_per_week over the range', () => {
      // Two full weeks (14 days) at 3x/week -> 6.
      expect(
        expectedHabitCompletions(
          { kind: 'times_per_week', count: 3 },
          '2026-07-06',
          '2026-07-19',
        ),
      ).toBe(6)
    })

    it('is zero for an inverted range', () => {
      expect(
        expectedHabitCompletions({ kind: 'daily' }, '2026-07-20', '2026-07-19'),
      ).toBe(0)
    })
  })
})
