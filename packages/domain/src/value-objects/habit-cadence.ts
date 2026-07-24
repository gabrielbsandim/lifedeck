import { ValidationError } from '@/shared/domain-error'

// How often a habit is expected. Three shapes cover the common cases:
// - daily: every civil day.
// - weekdays: specific weekdays each week (0 = Sunday .. 6 = Saturday).
// - times_per_week: any N days within a Monday-started week.
export const HABIT_CADENCE_KINDS = [
  'daily',
  'weekdays',
  'times_per_week',
] as const

export type HabitCadenceKind = (typeof HABIT_CADENCE_KINDS)[number]

export type HabitCadence =
  | { kind: 'daily' }
  | { kind: 'weekdays'; weekdays: number[] }
  | { kind: 'times_per_week'; count: number }

const MS_PER_DAY = 86_400_000
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
// A weekly target above 7 is unsatisfiable.
const MAX_TIMES_PER_WEEK = 7

function isCadenceKind(value: string): value is HabitCadenceKind {
  return (HABIT_CADENCE_KINDS as readonly string[]).includes(value)
}

export function validateHabitCadence(cadence: HabitCadence): HabitCadence {
  if (!isCadenceKind(cadence.kind)) {
    throw new ValidationError('Habit cadence kind is invalid.')
  }
  if (cadence.kind === 'daily') {
    return { kind: 'daily' }
  }
  if (cadence.kind === 'weekdays') {
    const weekdays = cadence.weekdays
    if (!Array.isArray(weekdays) || weekdays.length === 0) {
      throw new ValidationError('Habit weekdays must not be empty.')
    }
    const valid = weekdays.every(
      day => Number.isInteger(day) && day >= 0 && day <= 6,
    )
    if (!valid) {
      throw new ValidationError('Habit weekdays must be between 0 and 6.')
    }
    // Store a sorted, de-duplicated list so equal cadences serialize equally.
    const unique = [...new Set(weekdays)].sort((a, b) => a - b)
    return { kind: 'weekdays', weekdays: unique }
  }
  const count = cadence.count
  if (!Number.isInteger(count) || count < 1 || count > MAX_TIMES_PER_WEEK) {
    throw new ValidationError(
      `Habit times per week must be between 1 and ${MAX_TIMES_PER_WEEK}.`,
    )
  }
  return { kind: 'times_per_week', count }
}

// The weekday (0 = Sunday .. 6 = Saturday) of a `YYYY-MM-DD` civil date. Civil
// dates are already localized, so reading them as UTC midnight is unambiguous.
export function weekdayOfCivilDate(date: string): number {
  if (!DATE_PATTERN.test(date)) {
    throw new ValidationError('Civil date must be a YYYY-MM-DD string.')
  }
  return new Date(`${date}T00:00:00.000Z`).getUTCDay()
}

function addDays(date: string, delta: number): string {
  const shifted =
    new Date(`${date}T00:00:00.000Z`).getTime() + delta * MS_PER_DAY
  return new Date(shifted).toISOString().slice(0, 10)
}

// Monday of the week containing `date`, so `times_per_week` streaks count whole
// weeks with a stable, timezone-free boundary.
function weekStartOf(date: string): string {
  const weekday = weekdayOfCivilDate(date)
  const daysAfterMonday = (weekday + 6) % 7
  return addDays(date, -daysAfterMonday)
}

// Whether the cadence expects the habit on `date`. `times_per_week` and `daily`
// accept any day; `weekdays` accepts only its listed days.
export function isHabitScheduledOn(
  cadence: HabitCadence,
  date: string,
): boolean {
  if (cadence.kind === 'weekdays') {
    return cadence.weekdays.includes(weekdayOfCivilDate(date))
  }
  return true
}

// Current streak of satisfied periods ending at (or just before) `today`, walking
// back the same way get-analytics does. The unit is days for daily/weekdays and
// whole weeks for times_per_week. The current period gets grace: an unfinished
// today (or this week) never breaks a streak built from earlier days.
export function computeHabitStreak(
  cadence: HabitCadence,
  doneDates: Iterable<string>,
  today: string,
): number {
  const done = new Set(doneDates)
  if (done.size === 0) {
    return 0
  }
  let earliest = today
  for (const date of done) {
    if (date < earliest) {
      earliest = date
    }
  }

  if (cadence.kind === 'times_per_week') {
    const counts = new Map<string, number>()
    for (const date of done) {
      const week = weekStartOf(date)
      counts.set(week, (counts.get(week) ?? 0) + 1)
    }
    const target = cadence.count
    const satisfied = (week: string): boolean =>
      (counts.get(week) ?? 0) >= target

    let week = weekStartOf(today)
    // Grace: if this week is not yet complete, begin counting from last week so
    // a mid-week check does not read the streak as broken.
    if (!satisfied(week)) {
      week = addDays(week, -7)
    }
    let streak = 0
    const earliestWeek = weekStartOf(earliest)
    while (week >= earliestWeek && satisfied(week)) {
      streak += 1
      week = addDays(week, -7)
    }
    return streak
  }

  const scheduled = (date: string): boolean => isHabitScheduledOn(cadence, date)

  let cursor = today
  // Grace: an as-yet-undone scheduled today does not break an earlier streak.
  if (scheduled(cursor) && !done.has(cursor)) {
    cursor = addDays(cursor, -1)
  }
  // `cursor` strictly decreases each step and stops once it passes the earliest
  // done date, so the walk always terminates.
  let streak = 0
  while (cursor >= earliest) {
    if (!scheduled(cursor)) {
      cursor = addDays(cursor, -1)
      continue
    }
    if (!done.has(cursor)) {
      break
    }
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

// How many completions the cadence expects across the inclusive civil-date range
// `[from, to]`: the denominator for an adherence/consistency rate. `daily` expects
// every day, `weekdays` expects only its listed days, and `times_per_week` expects
// `count` per seven-day span (rounded over the whole range). An empty or inverted
// range expects nothing. The caller clamps `from` to the habit's creation so a new
// habit is not judged against days before it existed.
export function expectedHabitCompletions(
  cadence: HabitCadence,
  from: string,
  to: string,
): number {
  if (from > to) {
    return 0
  }
  const totalDays =
    Math.round(
      (new Date(`${to}T00:00:00.000Z`).getTime() -
        new Date(`${from}T00:00:00.000Z`).getTime()) /
        MS_PER_DAY,
    ) + 1
  if (cadence.kind === 'daily') {
    return totalDays
  }
  if (cadence.kind === 'times_per_week') {
    return Math.round((totalDays / 7) * cadence.count)
  }
  let count = 0
  for (let cursor = from; cursor <= to; cursor = addDays(cursor, 1)) {
    if (cadence.weekdays.includes(weekdayOfCivilDate(cursor))) {
      count += 1
    }
  }
  return count
}
