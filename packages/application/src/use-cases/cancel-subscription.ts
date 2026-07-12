import { asEntityId, type PaymentProvider } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { PaymentGateway } from '@/ports/payment-gateway'
import type { SubscriptionRepository } from '@/ports/subscription-repository'

type Dependencies = {
  gateways: Record<PaymentProvider, PaymentGateway>
  subscriptions: SubscriptionRepository
  clock: Clock
}

export function makeCancelSubscription({
  gateways,
  subscriptions,
  clock,
}: Dependencies) {
  return async function cancelSubscription(
    userId: string,
  ): Promise<{ cancelAtPeriodEnd: boolean }> {
    const all = await subscriptions.listByUser(asEntityId(userId))
    // A past_due subscription is still live at the provider (dunning), so the
    // user must be able to cancel it too; only an already-canceled one has
    // nothing to do. Cancel every live subscription so an upgrade that opened a
    // second one never keeps billing after the user asked to stop.
    const cancelable = all.filter(
      subscription => subscription.status !== 'canceled',
    )
    if (cancelable.length === 0) {
      throw new NotFoundError('Active subscription')
    }

    const now = clock.now()
    for (const subscription of cancelable) {
      await gateways[subscription.provider].cancelSubscription(
        subscription.providerRef,
      )
      subscription.requestCancellation(now)
      await subscriptions.save(subscription)
    }
    return { cancelAtPeriodEnd: true }
  }
}
