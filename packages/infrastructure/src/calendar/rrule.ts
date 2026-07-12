import type { RecurrenceRule } from '@lifedeck/domain'

// Bidirectional mapping between the app's compact RecurrenceRule and Google
// Calendar's RFC 5545 `recurrence` array (a single RRULE line). Weekday numbers
// follow getUTCDay() (0 = Sunday ... 6 = Saturday), which lines up with the
// fixed RFC 5545 day tokens below. Anything Google sends that we cannot model
// (FREQ=YEARLY, ordinal BYDAY like 2MO, COUNT, RDATE) degrades to a plain,
// non-recurring event rather than a thrown sync.

const WEEKDAY_TOKENS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const

const FREQ_TO_TOKEN: Record<RecurrenceRule['freq'], string> = {
  daily: 'DAILY',
  weekly: 'WEEKLY',
  monthly: 'MONTHLY',
}

const TOKEN_TO_FREQ: Record<string, RecurrenceRule['freq']> = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
}

export function toGoogleRecurrence(rule: RecurrenceRule): string[] {
  const parts = [
    `FREQ=${FREQ_TO_TOKEN[rule.freq]}`,
    `INTERVAL=${rule.interval}`,
  ]
  if (rule.byWeekday && rule.byWeekday.length > 0) {
    const days = rule.byWeekday
      .filter(day => day >= 0 && day <= 6)
      .map(day => WEEKDAY_TOKENS[day])
    if (days.length > 0) {
      parts.push(`BYDAY=${days.join(',')}`)
    }
  }
  if (rule.byMonthday !== undefined) {
    parts.push(`BYMONTHDAY=${rule.byMonthday}`)
  }
  if (rule.until) {
    // RFC 5545 UNTIL is an inclusive UTC timestamp; anchor to end of day so the
    // final occurrence on that calendar date is kept.
    parts.push(`UNTIL=${rule.until.replace(/-/g, '')}T235959Z`)
  }
  return [`RRULE:${parts.join(';')}`]
}

export function fromGoogleRecurrence(
  lines: readonly string[] | undefined,
  startDate: string,
): RecurrenceRule | null {
  const rruleLine = lines?.find(line => line.toUpperCase().startsWith('RRULE:'))
  if (!rruleLine) {
    return null
  }
  const fields = parseFields(rruleLine.slice(rruleLine.indexOf(':') + 1))

  const freqToken = fields.get('FREQ')?.toUpperCase()
  const freq = freqToken ? TOKEN_TO_FREQ[freqToken] : undefined
  if (!freq) {
    return null
  }

  const rule: RecurrenceRule = {
    freq,
    interval: parseInterval(fields.get('INTERVAL')),
    startDate,
  }

  const weekdays = parseByday(fields.get('BYDAY'))
  if (weekdays.length > 0) {
    rule.byWeekday = weekdays
  }

  const monthday = parseMonthday(fields.get('BYMONTHDAY'))
  if (monthday !== null) {
    rule.byMonthday = monthday
  }

  const until = parseUntil(fields.get('UNTIL'))
  // The domain rejects an UNTIL earlier than the start; drop it in that case so
  // the event still syncs (as an open-ended series) instead of failing.
  if (until && until >= startDate) {
    rule.until = until
  }

  return rule
}

function parseFields(body: string): Map<string, string> {
  const fields = new Map<string, string>()
  for (const pair of body.split(';')) {
    const index = pair.indexOf('=')
    if (index <= 0) {
      continue
    }
    fields.set(pair.slice(0, index).toUpperCase(), pair.slice(index + 1))
  }
  return fields
}

function parseInterval(raw: string | undefined): number {
  const value = Number(raw)
  return Number.isInteger(value) && value >= 1 ? value : 1
}

function parseByday(raw: string | undefined): number[] {
  if (!raw) {
    return []
  }
  const days: number[] = []
  for (const token of raw.split(',')) {
    // Strip any ordinal prefix (e.g. "2MO", "-1FR"); we keep only the weekday.
    const day = token.trim().slice(-2).toUpperCase()
    const index = WEEKDAY_TOKENS.indexOf(day as (typeof WEEKDAY_TOKENS)[number])
    if (index >= 0 && !days.includes(index)) {
      days.push(index)
    }
  }
  return days
}

function parseMonthday(raw: string | undefined): number | null {
  if (!raw) {
    return null
  }
  const value = Number(raw.split(',')[0])
  return Number.isInteger(value) && value >= 1 && value <= 31 ? value : null
}

function parseUntil(raw: string | undefined): string | null {
  if (!raw) {
    return null
  }
  const digits = raw.replace(/[^0-9]/g, '')
  if (digits.length < 8) {
    return null
  }
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
}
