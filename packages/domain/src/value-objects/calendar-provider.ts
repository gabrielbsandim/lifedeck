export const CALENDAR_PROVIDERS = ['google', 'apple', 'calcom'] as const

export type CalendarProviderName = (typeof CALENDAR_PROVIDERS)[number]

export function isCalendarProvider(
  value: string,
): value is CalendarProviderName {
  return (CALENDAR_PROVIDERS as readonly string[]).includes(value)
}
