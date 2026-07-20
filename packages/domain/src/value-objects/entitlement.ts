export const ENTITLEMENTS = [
  'calendarSync',
  'whatsappAssistant',
  'premiumModel',
  // Assistant-initiated WhatsApp: the daily brief, habit check-ins, and nudges.
  'proactiveMessaging',
  // The "find me time" scheduling flow.
  'smartScheduling',
] as const

export type Entitlement = (typeof ENTITLEMENTS)[number]

export function isEntitlement(value: string): value is Entitlement {
  return (ENTITLEMENTS as readonly string[]).includes(value)
}
