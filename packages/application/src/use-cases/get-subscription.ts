import { asEntityId } from '@lifedeck/domain'
import type { SubscriptionView } from '@/dtos/billing-dto'
import { toSubscriptionView } from '@/mappers/subscription-mapper'
import type { SubscriptionRepository } from '@/ports/subscription-repository'

type Dependencies = {
  subscriptions: SubscriptionRepository
}

export function makeGetSubscription({ subscriptions }: Dependencies) {
  return async function getSubscription(
    userId: string,
  ): Promise<SubscriptionView | null> {
    const all = await subscriptions.listByUser(asEntityId(userId))
    if (all.length === 0) {
      return null
    }
    // Prefer a still-live subscription over a stale canceled one when a user
    // holds more than one; otherwise fall back to the most recent.
    const chosen =
      all.find(subscription => subscription.status !== 'canceled') ?? all[0]
    return chosen ? toSubscriptionView(chosen) : null
  }
}
