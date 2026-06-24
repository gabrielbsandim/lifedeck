import {
  Subscription,
  asEntityId,
  type PaymentProvider,
} from '@lifedeck/domain'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { PaymentGateway } from '@/ports/payment-gateway'
import type { SubscriptionRepository } from '@/ports/subscription-repository'

type Dependencies = {
  gateways: Record<PaymentProvider, PaymentGateway>
  subscriptions: SubscriptionRepository
  ids: IdGenerator
  clock: Clock
}

export function makeHandleSubscriptionWebhook({
  gateways,
  subscriptions,
  ids,
  clock,
}: Dependencies) {
  return async function handleSubscriptionWebhook(
    provider: PaymentProvider,
    rawBody: string,
    signature: string | null,
  ): Promise<{ handled: boolean }> {
    const event = await gateways[provider].parseWebhook(rawBody, signature)
    if (!event) {
      return { handled: false }
    }

    const existing = await subscriptions.findByProviderRef(
      provider,
      event.providerRef,
    )
    if (existing) {
      existing.update(
        {
          plan: event.plan ?? undefined,
          status: event.status,
          currentPeriodEnd: event.currentPeriodEnd,
        },
        clock.now(),
      )
      await subscriptions.save(existing)
      return { handled: true }
    }

    if (!event.userId || !event.plan) {
      return { handled: false }
    }

    const created = Subscription.create({
      id: ids.generate(),
      userId: asEntityId(event.userId),
      plan: event.plan,
      status: event.status,
      provider,
      providerRef: event.providerRef,
      currentPeriodEnd: event.currentPeriodEnd,
      now: clock.now(),
    })
    await subscriptions.save(created)
    return { handled: true }
  }
}
