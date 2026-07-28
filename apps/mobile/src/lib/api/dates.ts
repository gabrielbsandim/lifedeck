// Ported from apps/web/src/lib/api/dates.ts. Only the time-zone lookup differs:
// the web asks Intl, which on Hermes can resolve to UTC, so the app asks the OS
// through expo-localization and keeps Intl as the fallback.
import { getCalendars } from 'expo-localization'

export function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayIso(now: Date = new Date()): string {
  return toIsoDate(now)
}

export function addDays(date: string, delta: number): string {
  const parsed = new Date(`${date}T00:00:00.000Z`)
  parsed.setUTCDate(parsed.getUTCDate() + delta)
  return parsed.toISOString().slice(0, 10)
}

export function deviceTimeZone(): string {
  const fromOs = getCalendars()[0]?.timeZone
  if (fromOs) {
    return fromOs
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}
