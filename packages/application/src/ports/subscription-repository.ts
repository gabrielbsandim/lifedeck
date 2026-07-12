import type { EntityId, PaymentProvider, Subscription } from '@lifedeck/domain'

export interface SubscriptionRepository {
  save(subscription: Subscription): Promise<void>
  findByUser(userId: EntityId): Promise<Subscription | null>
  // All of a user's subscriptions, most recent first. A user can hold more than
  // one row (an upgrade opens a new provider subscription), so plan resolution
  // and cancellation must look across all of them, not just the latest.
  listByUser(userId: EntityId): Promise<Subscription[]>
  findByProviderRef(
    provider: PaymentProvider,
    providerRef: string,
  ): Promise<Subscription | null>
}
