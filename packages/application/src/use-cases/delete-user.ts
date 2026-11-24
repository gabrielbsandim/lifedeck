import { asEntityId, type PaymentProvider } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import type { ConversationStore } from '@/ports/conversation-store'
import type { PaymentGateway } from '@/ports/payment-gateway'
import type { SubscriptionRepository } from '@/ports/subscription-repository'
import type { UserRepository } from '@/ports/user-repository'

type Dependencies = {
  users: UserRepository
  conversations: ConversationStore
  subscriptions: Pick<SubscriptionRepository, 'listByUser'>
  gateways: Record<PaymentProvider, Pick<PaymentGateway, 'cancelSubscription'>>
}

export function makeDeleteUser({
  users,
  conversations,
  subscriptions,
  gateways,
}: Dependencies) {
  return async function deleteUser(userId: string): Promise<void> {
    const id = asEntityId(userId)
    const user = await users.findById(id)
    if (!user) {
      throw new NotFoundError('User')
    }
    // The FK cascade only drops our copy; the provider would keep charging. A
    // provider error aborts the deletion so the user can retry, never orphaned.
    const live = (await subscriptions.listByUser(id)).filter(
      subscription => subscription.status !== 'canceled',
    )
    for (const subscription of live) {
      await gateways[subscription.provider].cancelSubscription(
        subscription.providerRef,
      )
    }
    // Relational children are removed by Postgres FK cascade; the conversation
    // log lives in Redis and must be cleared explicitly.
    await conversations.clear(userId)
    await users.delete(id)
  }
}
