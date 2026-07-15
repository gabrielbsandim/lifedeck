import type { CalendarEventView } from '@lifedeck/application'

// Single-calendar backend: we sync only the user's primary Google calendar, so
// there is no multi-calendar palette. We still colour by origin — events synced
// from Google use the brand accent, events created locally use violet — to give
// the agenda and month chips the coloured-bar look from the prototype.
export function eventColor(event: CalendarEventView): string {
  return event.source === 'google'
    ? 'var(--color-brand-600)'
    : 'var(--color-violet-500)'
}

export function eventTint(event: CalendarEventView): string {
  return `color-mix(in oklch, ${eventColor(event)} 14%, white)`
}

export function eventCalendarLabel(
  event: CalendarEventView,
  syncedLabel: string,
  localLabel: string,
): string {
  return event.source === 'google' ? syncedLabel : localLabel
}

export function formatEventTime(
  event: CalendarEventView,
  timeZone: string,
  locale: string,
  allDayLabel: string,
): string {
  if (event.allDay) {
    return allDayLabel
  }
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(new Date(event.startsAt))
}
