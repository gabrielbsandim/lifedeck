// Maps a user's app locale to the WhatsApp/Meta template language code so a
// reminder renders in the recipient's language instead of one global default.
// The template must be registered in the matching language on Meta; when the
// locale is unknown we fall back to the configured default language.
const LOCALE_TO_WHATSAPP_LANGUAGE: Record<string, string> = {
  pt: 'pt_BR',
  en: 'en',
  es: 'es',
}

export function whatsappLanguageForLocale(
  locale: string | undefined,
  fallback: string,
): string {
  if (locale === undefined) {
    return fallback
  }
  return LOCALE_TO_WHATSAPP_LANGUAGE[locale] ?? fallback
}
