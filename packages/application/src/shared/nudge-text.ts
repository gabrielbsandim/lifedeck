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
  fr: ({ taskTitle, days }) =>
    `👀 "${taskTitle}" est sur ta liste depuis ${days} jours. Tu veux que je la replanifie ou que je la découpe en étapes plus petites ? Réponds et je t’aide.`,
  de: ({ taskTitle, days }) =>
    `👀 "${taskTitle}" steht seit ${days} Tagen auf deiner Liste. Soll ich sie verschieben oder in kleinere Schritte aufteilen? Antworte einfach, ich helfe dir.`,
  it: ({ taskTitle, days }) =>
    `👀 "${taskTitle}" è nella tua lista da ${days} giorni. Vuoi che la ripianifichi o la divida in passi più piccoli? Rispondi e ti aiuto.`,
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
  fr: { yes: 'Oui, replanifie', no: 'Pas aujourd’hui' },
  de: { yes: 'Ja, verschieben', no: 'Heute nicht' },
  it: { yes: 'Sì, ripianifica', no: 'Oggi no' },
}

export function nudgeButtonLabels(
  language: MessageLanguage,
): NudgeButtonLabels {
  return BUTTONS[language]
}
