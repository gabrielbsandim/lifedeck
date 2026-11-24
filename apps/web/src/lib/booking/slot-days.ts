import type { BookableSlotView } from '@lifedeck/application'

const DAY_MS = 86_400_000

export type SlotDay = { date: string; slots: BookableSlotView[] }

export function civilDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

// Slots arrive sorted from the API; grouping keeps that order per day.
export function groupSlotsByDay(
  slots: BookableSlotView[],
  timeZone: string,
): SlotDay[] {
  const days = new Map<string, BookableSlotView[]>()
  for (const slot of slots) {
    const date = civilDate(slot.startsAt, timeZone)
    days.set(date, [...(days.get(date) ?? []), slot])
  }
  return [...days].map(([date, daySlots]) => ({ date, slots: daySlots }))
}

export function formatSlotTime(
  iso: string,
  locale: string,
  timeZone: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function formatSlotDay(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${date}T12:00:00.000Z`))
}

export function formatSlotMoment(
  iso: string,
  locale: string,
  timeZone: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function slotWindow(
  start: Date,
  days: number,
): { from: string; to: string } {
  return {
    from: start.toISOString(),
    to: new Date(start.getTime() + days * DAY_MS).toISOString(),
  }
}

export function timeZoneOptions(current: string): string[] {
  const known = Intl.supportedValuesOf('timeZone')
  return known.includes(current) ? known : [current, ...known]
}
