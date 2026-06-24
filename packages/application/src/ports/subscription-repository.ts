import type { EntityId, PaymentProvider, Subscription } from '@lifedeck/domain'

export interface SubscriptionRepository {
  save(subscription: Subscription): Promise<void>
  findByUser(userId: EntityId): Promise<Subscription | null>
  findByProviderRef(
    provider: PaymentProvider,
    providerRef: string,
  ): Promise<Subscription | null>
}
