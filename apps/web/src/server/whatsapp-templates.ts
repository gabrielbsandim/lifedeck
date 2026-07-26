// The pre-approved WhatsApp utility templates, by the name they are registered
// under in the Meta WhatsApp Manager.
//
// These are names of things we own, identical in every environment, so they are
// code rather than configuration: an env var per template only created a way for
// production to silently disagree with Meta. That is not hypothetical, it is what
// happened: with none of them set, every proactive message outside WhatsApp's 24h
// window was dropped without a trace (see docs/whatsapp.md).
//
// Renaming one here means re-registering it there. A template that does not exist
// (or is not approved yet) makes the send fail loudly as `proactive_send_failed`,
// and the message still reaches the user through the in-app notification bell.
//
// The `_v1` suffix follows the existing `reminder_v1`: a template's body cannot be
// edited freely once approved, so a wording change means registering the next
// version alongside it and bumping the name here.
export const WHATSAPP_TEMPLATES = {
  reminder: 'reminder_v1',
  dailyBrief: 'daily_brief_v1',
  habitCheckin: 'habit_checkin_v1',
  nudge: 'nudge_v1',
} as const

// The language every template is registered in. `whatsappLanguageForLocale`
// narrows to the recipient's variant when their locale has one registered.
export const WHATSAPP_TEMPLATE_LANGUAGE = 'pt_BR'

export function whatsappTemplate(
  name: (typeof WHATSAPP_TEMPLATES)[keyof typeof WHATSAPP_TEMPLATES],
): { name: string; language: string } {
  return { name, language: WHATSAPP_TEMPLATE_LANGUAGE }
}
