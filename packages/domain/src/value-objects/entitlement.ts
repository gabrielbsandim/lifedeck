export const ENTITLEMENTS = [
  'calendarSync',
  'whatsappAssistant',
  'premiumModel',
] as const

export type Entitlement = (typeof ENTITLEMENTS)[number]

export function isEntitlement(value: string): value is Entitlement {
  return (ENTITLEMENTS as readonly string[]).includes(value)
}
