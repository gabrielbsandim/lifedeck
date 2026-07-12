import type { EmailLocale } from '@/ports/email-sender'

const LOCALE_TAG: Record<EmailLocale, string> = {
  en: 'en',
  pt: 'pt-BR',
  es: 'es',
}

// Localized, timezone-aware event time (for reminder copy across channels).
// Falls back to UTC for an invalid IANA zone and to the raw value for an
// unparseable date, so a bad input never throws in a best-effort reminder.
export function formatEventTime(
  startsAt: string,
  locale: EmailLocale,
  timeZone: string,
): string {
  const date = new Date(startsAt)
  if (Number.isNaN(date.getTime())) {
    return startsAt
  }
  try {
    return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone,
    }).format(date)
  } catch {
    // Invalid IANA zone: fall back to UTC rather than throwing.
    return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(date)
  }
}
