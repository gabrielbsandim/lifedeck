// Maps a user's app locale to the WhatsApp/Meta template language code so a
// reminder renders in the recipient's language instead of one global default.
// The template must be registered in the matching language on Meta; when the
// locale is unknown we fall back to the configured default language.
// These must match the language versions actually registered on Meta, exactly:
// asking for `en` when the template was approved as `en_US` is a failed send, not
// a graceful fallback. See the table in docs/whatsapp.md.
const LOCALE_TO_WHATSAPP_LANGUAGE: Record<string, string> = {
  pt: 'pt_BR',
  en: 'en_US',
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
