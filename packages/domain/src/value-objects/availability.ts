import { ValidationError } from '@/shared/domain-error'

const MINUTES_PER_DAY = 1440
const MAX_WINDOWS_PER_DAY = 8
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** A span of local wall-clock minutes; `endMinute` 1440 is the next midnight. */
export type DayWindow = { startMinute: number; endMinute: number }

/** Weekly opening hours: `weekday` 0 is Sunday, in the booking page's zone. */
export type WeeklyWindow = DayWindow & { weekday: number }

/** Replaces the weekly hours on one civil date; no windows means closed. */
export type AvailabilityOverride = { date: string; windows: DayWindow[] }

function validateDayWindow(window: DayWindow): DayWindow {
  const { startMinute, endMinute } = window
  const valid =
    Number.isInteger(startMinute) &&
    Number.isInteger(endMinute) &&
    startMinute >= 0 &&
    endMinute <= MINUTES_PER_DAY &&
    startMinute < endMinute
  if (!valid) {
    throw new ValidationError(
      'An availability window must start before it ends, within one day.',
    )
  }
  return { startMinute, endMinute }
}

function assertNoOverlap(windows: DayWindow[]): void {
  const sorted = [...windows].sort((a, b) => a.startMinute - b.startMinute)
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i]!.startMinute < sorted[i - 1]!.endMinute) {
      throw new ValidationError('Availability windows must not overlap.')
    }
  }
}

function validateDayWindows(windows: DayWindow[]): DayWindow[] {
  if (windows.length > MAX_WINDOWS_PER_DAY) {
    throw new ValidationError(
      `A day may have at most ${MAX_WINDOWS_PER_DAY} availability windows.`,
    )
  }
  const valid = windows.map(validateDayWindow)
  assertNoOverlap(valid)
  return valid.sort((a, b) => a.startMinute - b.startMinute)
}

export function validateWeeklyAvailability(
  windows: WeeklyWindow[],
): WeeklyWindow[] {
  const byDay = new Map<number, DayWindow[]>()
  for (const window of windows) {
    const { weekday } = window
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      throw new ValidationError('Weekday must be between 0 and 6.')
    }
    byDay.set(window.weekday, [...(byDay.get(window.weekday) ?? []), window])
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .flatMap(([weekday, dayWindows]) =>
      validateDayWindows(dayWindows).map(window => ({ weekday, ...window })),
    )
}

export function validateAvailabilityOverride(
  override: AvailabilityOverride,
): AvailabilityOverride {
  if (!DATE_PATTERN.test(override.date)) {
    throw new ValidationError('Override date must be a YYYY-MM-DD string.')
  }
  return { date: override.date, windows: validateDayWindows(override.windows) }
}
