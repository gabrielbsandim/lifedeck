import {
  occurrencesBetween,
  type RecurrenceRule,
} from '@/value-objects/recurrence-rule'
import {
  civilDate,
  civilTime,
  zonedWallTimeToInstant,
} from '@/value-objects/time-zone'

const MS_PER_DAY = 86_400_000

export type RecurringInstant = {
  startsAt: Date
  endsAt: Date
}

// Recurrence rules are written in the owner's wall clock: "every Tuesday at
// 22:00" stays a Tuesday at 22:00 across DST, whatever that is in UTC.
export function recurringInstantsBetween(params: {
  rule: RecurrenceRule
  firstStartsAt: Date
  durationMs: number
  from: Date
  to: Date
  timeZone: string
}): RecurringInstant[] {
  const { rule, firstStartsAt, durationMs, from, to, timeZone } = params
  const anchored: RecurrenceRule = {
    ...rule,
    startDate: civilDate(firstStartsAt, timeZone),
  }
  const clock = civilTime(firstStartsAt, timeZone)
  // Start a day early so an occurrence that began yesterday and runs into the
  // range is still returned.
  const scanFrom = new Date(
    `${civilDate(new Date(from.getTime() - MS_PER_DAY), timeZone)}T00:00:00.000Z`,
  )
  const scanTo = new Date(`${civilDate(to, timeZone)}T00:00:00.000Z`)
  const result: RecurringInstant[] = []
  for (const day of occurrencesBetween(anchored, scanFrom, scanTo)) {
    const startsAt = zonedWallTimeToInstant(
      day.toISOString().slice(0, 10),
      clock.hour,
      clock.minute,
      clock.second,
      timeZone,
    )
    const endsAt = new Date(startsAt.getTime() + durationMs)
    if (startsAt.getTime() > to.getTime()) {
      continue
    }
    if (endsAt.getTime() < from.getTime()) {
      continue
    }
    result.push({ startsAt, endsAt })
  }
  return result
}
