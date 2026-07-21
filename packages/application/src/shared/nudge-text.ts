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

export type NudgeButtonLabels = { yes: string; no: string }

// Quick-reply labels for the nudge, one pair per language. Kept short (WhatsApp
// caps a button title at 20 chars). "yes" invites the assistant to reschedule
// the task; "no" defers it. The reply flows back through the assistant with the
// nudge in context, so it acts on the same task without extra plumbing.
const BUTTONS: Record<MessageLanguage, NudgeButtonLabels> = {
  en: { yes: 'Yes, reschedule', no: 'Not today' },
  pt: { yes: 'Sim, reagende', no: 'Hoje não' },
  es: { yes: 'Sí, reprográmala', no: 'Hoy no' },
}

export function nudgeButtonLabels(
  language: MessageLanguage,
): NudgeButtonLabels {
  return BUTTONS[language]
}
