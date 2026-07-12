import type { Subscription } from '@lifedeck/domain'
import type { SubscriptionView } from '@/dtos/billing-dto'

export function toSubscriptionView(
  subscription: Subscription,
): SubscriptionView {
  const props = subscription.toJSON()
  return {
    plan: props.plan,
    status: props.status,
    provider: props.provider,
    currentPeriodEnd: props.currentPeriodEnd
      ? props.currentPeriodEnd.toISOString()
      : null,
    cancelAtPeriodEnd: props.cancelAtPeriodEnd,
  }
}
