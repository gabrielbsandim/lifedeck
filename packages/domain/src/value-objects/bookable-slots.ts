import {
  findFreeSlots,
  mergeIntervals,
  type TimeInterval,
} from '@/value-objects/free-slots'
import { civilDate, zonedWallTimeToInstant } from '@/value-objects/time-zone'
import type {
  AvailabilityOverride,
  DayWindow,
  WeeklyWindow,
} from '@/value-objects/availability'

const MINUTE_MS = 60_000
const DAY_MS = 24 * 60 * MINUTE_MS
// Bounds the work per call: a month of 5-minute slots stays under this.
const MAX_SLOTS = 10_000
const MAX_DAYS = 400

export type BookableSlotsParams = {
  timezone: string
  weekly: WeeklyWindow[]
  overrides: AvailabilityOverride[]
  /** Requested range; a slot is offered when it starts inside [from, to). */
  from: Date
  to: Date
  now: Date
  durationMin: number
  slotStepMin: number
  bufferBeforeMin: number
  bufferAfterMin: number
  minNoticeMin: number
  maxHorizonDays: number
  maxPerDay: number | null
  /** Everything that blocks the host: busy calendar events, held bookings. */
  busy: TimeInterval[]
  /** Starts of this service's held bookings, counted against `maxPerDay`. */
  bookedStarts: Date[]
}

function nextCivilDay(date: string): string {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) + DAY_MS)
    .toISOString()
    .slice(0, 10)
}

function civilDaysBetween(first: string, last: string): string[] {
  const days: string[] = []
  for (
    let day = first;
    day <= last && days.length < MAX_DAYS;
    day = nextCivilDay(day)
  ) {
    days.push(day)
  }
  return days
}

function windowsOn(
  date: string,
  weekly: WeeklyWindow[],
  overrides: Map<string, DayWindow[]>,
): DayWindow[] {
  const override = overrides.get(date)
  if (override) {
    return override
  }
  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay()
  return weekly.filter(window => window.weekday === weekday)
}

function fullDays(params: BookableSlotsParams): Set<string> {
  const { maxPerDay, bookedStarts, timezone } = params
  if (maxPerDay === null) {
    return new Set()
  }
  const perDay = new Map<string, number>()
  for (const start of bookedStarts) {
    const day = civilDate(start, timezone)
    perDay.set(day, (perDay.get(day) ?? 0) + 1)
  }
  return new Set(
    [...perDay.entries()]
      .filter(([, count]) => count >= maxPerDay)
      .map(([day]) => day),
  )
}

/**
 * The slots a client may book for one service: the host's weekly hours (or
 * that date's override) in the page's zone, minus busy time padded by the
 * service buffers, from `minNoticeMin` after now up to `maxHorizonDays`, and
 * skipping days that already hold `maxPerDay` of this service's bookings.
 */
export function bookableSlots(params: BookableSlotsParams): TimeInterval[] {
  const { timezone, now } = params
  const earliest = Math.max(
    params.from.getTime(),
    now.getTime() + params.minNoticeMin * MINUTE_MS,
  )
  const latest = Math.min(
    params.to.getTime(),
    now.getTime() + params.maxHorizonDays * DAY_MS,
  )
  if (latest <= earliest) {
    return []
  }

  const overrides = new Map(
    params.overrides.map(override => [override.date, override.windows]),
  )
  const closed = fullDays(params)
  const days = civilDaysBetween(
    civilDate(new Date(earliest), timezone),
    civilDate(new Date(latest), timezone),
  )
  // Merging joins a window that ends at midnight with one that starts the next
  // day, so a slot may run across midnight.
  const windows = mergeIntervals(
    days
      .filter(day => !closed.has(day))
      .flatMap(day =>
        windowsOn(day, params.weekly, overrides).map(window => ({
          start: zonedWallTimeToInstant(
            day,
            0,
            window.startMinute,
            0,
            timezone,
          ),
          end: zonedWallTimeToInstant(day, 0, window.endMinute, 0, timezone),
        })),
      ),
  )

  // A slot needs `bufferBefore` clear before it and `bufferAfter` clear after
  // it, so each busy block grows by the opposite buffer on each side.
  const busy = params.busy.map(block => ({
    start: new Date(block.start.getTime() - params.bufferAfterMin * MINUTE_MS),
    end: new Date(block.end.getTime() + params.bufferBeforeMin * MINUTE_MS),
  }))
  busy.push({ start: new Date(0), end: new Date(earliest) })

  return findFreeSlots({
    windows,
    busy,
    durationMin: params.durationMin,
    granularityMin: params.slotStepMin,
    maxResults: MAX_SLOTS,
  }).filter(slot => slot.start.getTime() < latest)
}
