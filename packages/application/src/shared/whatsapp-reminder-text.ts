import type { MessageLanguage } from '@lifedeck/domain'

// Free-form reminder copy for the WhatsApp 24h window (no template needed).
// Kept tiny and in the three languages the assistant speaks; the localized,
// timezone-aware time is computed by the caller.
const REMINDER_LABEL: Record<MessageLanguage, string> = {
  en: 'Reminder',
  pt: 'Lembrete',
  es: 'Recordatorio',
}

export function whatsappReminderText(
  language: MessageLanguage,
  title: string,
  when: string,
): string {
  return `⏰ ${REMINDER_LABEL[language]}: "${title}" — ${when}.`
}
