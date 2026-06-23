import { detectLocale, type Locale } from '@lifedeck/i18n'

export function resolveLocaleFromHeader(acceptLanguage: string | null): Locale {
  return detectLocale(acceptLanguage)
}
