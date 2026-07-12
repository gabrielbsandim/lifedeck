import { DEFAULT_PLAN, asEntityId, planRank, type Plan } from '@lifedeck/domain'
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
    const now = clock.now()
    const subscriptions_ = await subscriptions.listByUser(asEntityId(userId))
    // If a user somehow holds more than one active subscription (an upgrade
    // that opened a new one before the old was canceled), the highest-value
    // active plan wins so they are never under-served.
    return subscriptions_
      .filter(subscription => subscription.isActive(now))
      .reduce<Plan>(
        (best, subscription) =>
          planRank(subscription.plan) > planRank(best)
            ? subscription.plan
            : best,
        DEFAULT_PLAN,
      )
  }
}
