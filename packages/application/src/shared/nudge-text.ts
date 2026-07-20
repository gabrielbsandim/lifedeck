import type { MessageLanguage } from '@lifedeck/domain'

export type NudgeData = { taskTitle: string; days: number }

// The in-session free-form nudge, inlined per language like the reminder/brief/
// check-in copy. Out of session the caller sends the approved `nudge` template,
// whose single param is this composed text.
const COPY: Record<MessageLanguage, (data: NudgeData) => string> = {
  en: ({ taskTitle, days }) =>
    `👀 "${taskTitle}" has been on your list for ${days} days. Want me to reschedule it or break it into smaller steps? Just reply and I'll help.`,
  pt: ({ taskTitle, days }) =>
    `👀 "${taskTitle}" está na sua lista há ${days} dias. Quer que eu reagende ou divida em passos menores? É só responder que eu ajudo.`,
  es: ({ taskTitle, days }) =>
    `👀 "${taskTitle}" lleva ${days} días en tu lista. ¿Quieres que la reprograme o la divida en pasos más pequeños? Responde y te ayudo.`,
}

export function composeNudge(
  language: MessageLanguage,
  data: NudgeData,
): string {
  return COPY[language](data)
}
