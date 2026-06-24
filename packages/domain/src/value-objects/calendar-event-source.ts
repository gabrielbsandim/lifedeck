export const CALENDAR_EVENT_SOURCES = ['local', 'google'] as const

export type CalendarEventSource = (typeof CALENDAR_EVENT_SOURCES)[number]

export function isCalendarEventSource(
  value: string,
): value is CalendarEventSource {
  return (CALENDAR_EVENT_SOURCES as readonly string[]).includes(value)
}
