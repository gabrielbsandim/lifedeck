export const CALENDAR_PROVIDERS = ['google'] as const

export type CalendarProviderName = (typeof CALENDAR_PROVIDERS)[number]

export function isCalendarProvider(
  value: string,
): value is CalendarProviderName {
  return (CALENDAR_PROVIDERS as readonly string[]).includes(value)
}
