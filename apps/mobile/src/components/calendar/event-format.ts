// Ported from apps/web/src/components/calendar/event-format.ts. The web reads
// the accent from a CSS custom property; RN needs a resolved color, so the
// caller passes the current theme.
import type { CalendarEventView } from '@lifedeck/application'
import type { ThemeColors } from '@/theme/tokens'

// We colour by origin — events synced from an external provider use the brand
// accent, events created locally use violet — to give the agenda and month
// chips the coloured-bar look from the prototype.
export function eventColor(
  event: CalendarEventView,
  colors: ThemeColors,
): string {
  return event.source === 'google' ? colors.brand['600'] : colors.violet['500']
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
