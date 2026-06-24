import { DEFAULT_PLAN, asEntityId, type Plan } from '@lifedeck/domain'
import type { Clock } from '@/ports/clock'
import type { SubscriptionRepository } from '@/ports/subscription-repository'

type Dependencies = {
  subscriptions: SubscriptionRepository
  clock: Clock
}

export function makeResolvePlanFromSubscription({
  subscriptions,
  clock,
}: Dependencies) {
  return async function resolvePlanFromSubscription(
    userId: string,
  ): Promise<Plan> {
    const subscription = await subscriptions.findByUser(asEntityId(userId))
    if (subscription && subscription.isActive(clock.now())) {
      return subscription.plan
    }
    return DEFAULT_PLAN
  }
}
