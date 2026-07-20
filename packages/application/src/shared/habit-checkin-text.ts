import type { MessageLanguage } from '@lifedeck/domain'

// The in-session free-form check-in, inlined per language like the reminder and
// daily-brief copy (the application layer does not depend on @lifedeck/i18n).
// Out of session the caller sends the approved `habit_checkin` template instead,
// whose single param is the habit title.
const COPY: Record<MessageLanguage, (title: string) => string> = {
  en: title =>
    `✅ Did you ${title} today? Reply "yes" and I'll log it to keep your streak going.`,
  pt: title =>
    `✅ Você fez "${title}" hoje? Responda "sim" que eu registro e mantenho sua sequência.`,
  es: title =>
    `✅ ¿Hiciste "${title}" hoy? Responde "sí" y lo registro para mantener tu racha.`,
}

export function composeHabitCheckin(
  language: MessageLanguage,
  habitTitle: string,
): string {
  return COPY[language](habitTitle)
}
