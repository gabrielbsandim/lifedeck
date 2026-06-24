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
