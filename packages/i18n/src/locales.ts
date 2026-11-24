export const SUPPORTED_LOCALES = ['en', 'pt', 'es', 'fr', 'de', 'it'] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

const LOCALE_TAGS: Record<Locale, string[]> = {
  en: ['en', 'en-us', 'en-gb', 'en-au', 'en-ca'],
  pt: ['pt', 'pt-br', 'pt-pt'],
  es: ['es', 'es-es', 'es-mx', 'es-ar', 'es-co', 'es-cl', 'es-419'],
  fr: ['fr', 'fr-fr', 'fr-ca', 'fr-be', 'fr-ch'],
  de: ['de', 'de-de', 'de-at', 'de-ch'],
  it: ['it', 'it-it', 'it-ch'],
}

// Each language in its own name, for pickers.
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  pt: 'Português',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
}

export function resolveLocale(tag: string): Locale | null {
  const normalized = tag.trim().toLowerCase()
  if (!normalized) {
    return null
  }
  const base = normalized.replace(/-.*$/, '')
  for (const locale of SUPPORTED_LOCALES) {
    const tags = LOCALE_TAGS[locale]
    if (tags.includes(normalized) || tags.includes(base)) {
      return locale
    }
  }
  return null
}
