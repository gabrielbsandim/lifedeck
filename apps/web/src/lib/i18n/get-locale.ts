import { detectLocale, type Locale } from '@taskin/i18n'

export function resolveLocaleFromHeader(acceptLanguage: string | null): Locale {
  return detectLocale(acceptLanguage)
}
