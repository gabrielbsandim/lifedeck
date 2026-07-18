export const DEFAULT_TIME_ZONE = 'UTC'

export function isTimeZone(value: string): boolean {
  if (!value) {
    return false
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

export function civilDate(instant: Date, timeZone: string): string {
  const zone = isTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant)
  const value = (type: string): string =>
    parts.find(part => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

export function startOfCivilDay(instant: Date, timeZone: string): Date {
  return new Date(`${civilDate(instant, timeZone)}T00:00:00.000Z`)
}

export function civilHour(instant: Date, timeZone: string): number {
  const zone = isTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant)
  return Number(parts.find(part => part.type === 'hour')?.value ?? '0')
}

/** The zone's UTC offset at `instant`, formatted as `+HH:MM` / `-HH:MM`. */
export function zoneOffset(instant: Date, timeZone: string): string {
  const zone = isTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE
  const name =
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      timeZoneName: 'longOffset',
    })
      .formatToParts(instant)
      .find(part => part.type === 'timeZoneName')?.value ?? 'GMT'
  const match = name.match(/([+-]\d{2}:\d{2})$/)
  return match?.[1] ?? '+00:00'
}

/**
 * Format `instant` as an ISO 8601 string in `timeZone`, carrying that zone's
 * offset (e.g. `2026-07-18T11:00:00-03:00`). Unlike `toISOString()` (always
 * UTC), this preserves the wall-clock time the user sees, so times handed to or
 * read back from the assistant are unambiguous.
 */
export function zonedIso(instant: Date, timeZone: string): string {
  const zone = isTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant)
  const value = (type: string): string =>
    parts.find(part => part.type === type)?.value ?? ''
  const date = `${value('year')}-${value('month')}-${value('day')}`
  const time = `${value('hour')}:${value('minute')}:${value('second')}`
  return `${date}T${time}${zoneOffset(instant, zone)}`
}

/** The weekday name of `instant` in `timeZone` (e.g. `Saturday`). */
export function zonedWeekday(instant: Date, timeZone: string): string {
  const zone = isTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE
  return new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    weekday: 'long',
  }).format(instant)
}
