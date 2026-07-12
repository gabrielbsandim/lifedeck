import type { EntityId, PaymentProvider, Subscription } from '@lifedeck/domain'
import type { SubscriptionRepository } from '@/ports/subscription-repository'

export class InMemorySubscriptionRepository implements SubscriptionRepository {
  private readonly items = new Map<string, Subscription>()

  async save(subscription: Subscription): Promise<void> {
    this.items.set(subscription.id as string, subscription)
  }

  async findByUser(userId: EntityId): Promise<Subscription | null> {
    return (await this.listByUser(userId))[0] ?? null
  }

  async listByUser(userId: EntityId): Promise<Subscription[]> {
    return [...this.items.values()]
      .filter(item => item.userId === userId)
      .sort(
        (a, b) =>
          b.toJSON().createdAt.getTime() - a.toJSON().createdAt.getTime(),
      )
  }

  async findByProviderRef(
    provider: PaymentProvider,
    providerRef: string,
  ): Promise<Subscription | null> {
    return (
      [...this.items.values()].find(
        item => item.provider === provider && item.providerRef === providerRef,
      ) ?? null
    )
  }
}
