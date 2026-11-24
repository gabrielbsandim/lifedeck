import type { MessageLanguage } from '@lifedeck/domain'

// The in-session free-form check-in, inlined per language like the reminder and
// daily-brief copy (the application layer does not depend on @lifedeck/i18n).
//
// A check-in hour in the morning reaches the user before the habit could have
// happened, so asking "did you do it?" reads as nonsense. The copy follows the
// hour instead: a forward-looking nudge before noon, the retrospective question
// from noon on.
//
// Out of session the caller sends the approved `habit_checkin` template instead,
// whose single param is the habit title. That body is fixed at approval time and
// is always retrospective, so an early check-in hour only gets the prospective
// wording while WhatsApp's 24h window is open (and in the notification bell).
const RETROSPECTIVE_FROM_HOUR = 12

type Copy = {
  prospective: (title: string) => string
  retrospective: (title: string) => string
}

const COPY: Record<MessageLanguage, Copy> = {
  en: {
    prospective: title =>
      `☀️ ${title} is on your list for today. Tell me when it's done and I'll log it to keep your streak going.`,
    retrospective: title =>
      `✅ Did you ${title} today? Reply "yes" and I'll log it to keep your streak going.`,
  },
  pt: {
    prospective: title =>
      `☀️ Hoje tem "${title}". Me avisa quando terminar que eu registro e mantenho sua sequência.`,
    retrospective: title =>
      `✅ Você fez "${title}" hoje? Responda "sim" que eu registro e mantenho sua sequência.`,
  },
  es: {
    prospective: title =>
      `☀️ Hoy toca "${title}". Avísame cuando termines y lo registro para mantener tu racha.`,
    retrospective: title =>
      `✅ ¿Hiciste "${title}" hoy? Responde "sí" y lo registro para mantener tu racha.`,
  },
  fr: {
    prospective: title =>
      `☀️ Aujourd’hui, il y a "${title}". Dis-moi quand c’est fait et je l’enregistre pour garder ta série.`,
    retrospective: title =>
      `✅ Tu as fait "${title}" aujourd’hui ? Réponds "oui" et je l’enregistre pour garder ta série.`,
  },
  de: {
    prospective: title =>
      `☀️ Heute steht "${title}" an. Sag mir, wenn es erledigt ist, dann trage ich es ein und deine Serie läuft weiter.`,
    retrospective: title =>
      `✅ Hast du heute "${title}" gemacht? Antworte "ja", dann trage ich es ein und deine Serie läuft weiter.`,
  },
  it: {
    prospective: title =>
      `☀️ Oggi c’è "${title}". Dimmi quando hai finito e lo registro per mantenere la tua serie.`,
    retrospective: title =>
      `✅ Hai fatto "${title}" oggi? Rispondi "sì" e lo registro per mantenere la tua serie.`,
  },
}

export function composeHabitCheckin(
  language: MessageLanguage,
  habitTitle: string,
  localHour: number,
): string {
  const copy = COPY[language]
  return localHour < RETROSPECTIVE_FROM_HOUR
    ? copy.prospective(habitTitle)
    : copy.retrospective(habitTitle)
}
