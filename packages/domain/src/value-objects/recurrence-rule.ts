import { ValidationError } from '@/shared/domain-error'

export const RECURRENCE_FREQUENCIES = ['daily', 'weekly', 'monthly'] as const

export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number]

export type RecurrenceRule = {
  freq: RecurrenceFrequency
  interval: number
  byWeekday?: number[]
  byMonthday?: number
  startDate: string
  until?: string | null
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const MS_PER_DAY = 86_400_000

function isFrequency(value: string): value is RecurrenceFrequency {
  return (RECURRENCE_FREQUENCIES as readonly string[]).includes(value)
}

function parseDate(value: string, field: string): Date {
  const match = DATE_PATTERN.exec(value)
  if (!match) {
    throw new ValidationError(`${field} must be a YYYY-MM-DD date.`)
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new ValidationError(`${field} is not a real date.`)
  }
  return date
}

export function validateRecurrenceRule(rule: RecurrenceRule): RecurrenceRule {
  if (!isFrequency(rule.freq)) {
    throw new ValidationError('Recurrence frequency is invalid.')
  }
  if (!Number.isInteger(rule.interval) || rule.interval < 1) {
    throw new ValidationError('Recurrence interval must be a positive integer.')
  }
  if (rule.byWeekday !== undefined) {
    const valid = rule.byWeekday.every(
      day => Number.isInteger(day) && day >= 0 && day <= 6,
    )
    if (!valid) {
      throw new ValidationError('Recurrence weekdays must be between 0 and 6.')
    }
  }
  if (
    rule.byMonthday !== undefined &&
    (!Number.isInteger(rule.byMonthday) ||
      rule.byMonthday < 1 ||
      rule.byMonthday > 31)
  ) {
    throw new ValidationError('Recurrence month day must be between 1 and 31.')
  }

  const start = parseDate(rule.startDate, 'Recurrence start date')
  if (rule.until !== undefined && rule.until !== null) {
    const until = parseDate(rule.until, 'Recurrence until date')
    if (until < start) {
      throw new ValidationError(
        'Recurrence until date must not be before the start date.',
      )
    }
  }

  return rule
}

function daysSinceEpoch(date: Date): number {
  return Math.floor(date.getTime() / MS_PER_DAY)
}

function utcMidnight(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
}

function mondayWeekIndex(date: Date): number {
  return Math.floor((daysSinceEpoch(date) + 3) / 7)
}

// Upper bound on how many days a single expansion may scan. A calendar view is
// at most a month, so this only guards against a pathological range/rule.
const MAX_EXPANSION_DAYS = 1000

// Returns the UTC-midnight date of every day in [from, to] on which the rule
// fires. The caller re-attaches the master event's time-of-day to each date.
export function occurrencesBetween(
  rule: RecurrenceRule,
  from: Date,
  to: Date,
): Date[] {
  const result: Date[] = []
  const end = utcMidnight(to)
  let cursor = utcMidnight(from)
  let scanned = 0
  while (cursor.getTime() <= end.getTime() && scanned < MAX_EXPANSION_DAYS) {
    if (occursOn(rule, cursor)) {
      result.push(cursor)
    }
    cursor = new Date(cursor.getTime() + MS_PER_DAY)
    scanned += 1
  }
  return result
}

export function occursOn(rule: RecurrenceRule, date: Date): boolean {
  const target = utcMidnight(date)
  const start = parseDate(rule.startDate, 'Recurrence start date')

  if (target < start) {
    return false
  }
  if (rule.until !== undefined && rule.until !== null) {
    if (target > parseDate(rule.until, 'Recurrence until date')) {
      return false
    }
  }

  if (rule.freq === 'daily') {
    return (
      (daysSinceEpoch(target) - daysSinceEpoch(start)) % rule.interval === 0
    )
  }

  if (rule.freq === 'weekly') {
    const weekdays =
      rule.byWeekday && rule.byWeekday.length > 0
        ? rule.byWeekday
        : [start.getUTCDay()]
    if (!weekdays.includes(target.getUTCDay())) {
      return false
    }
    return (
      (mondayWeekIndex(target) - mondayWeekIndex(start)) % rule.interval === 0
    )
  }

  const monthday = rule.byMonthday ?? start.getUTCDate()
  if (target.getUTCDate() !== monthday) {
    return false
  }
  const monthsApart =
    (target.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (target.getUTCMonth() - start.getUTCMonth())
  return monthsApart >= 0 && monthsApart % rule.interval === 0
}
