export const SUBSCRIPTION_STATUSES = [
  'trialing',
  'active',
  'past_due',
  'canceled',
] as const

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

export function isSubscriptionStatus(
  value: string,
): value is SubscriptionStatus {
  return (SUBSCRIPTION_STATUSES as readonly string[]).includes(value)
}
