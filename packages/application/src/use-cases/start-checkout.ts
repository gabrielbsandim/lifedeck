import {
  CheckoutIntent,
  asEntityId,
  trialDaysFor,
  type PaymentProvider,
} from '@lifedeck/domain'
import type { CheckoutIntentRepository } from '@/ports/checkout-intent-repository'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type {
  CheckoutInput,
  CheckoutSession,
  Market,
  PaymentGateway,
} from '@/ports/payment-gateway'
import type { SubscriptionRepository } from '@/ports/subscription-repository'

type Dependencies = {
  gateways: Record<PaymentProvider, PaymentGateway>
  checkoutIntents: CheckoutIntentRepository
  subscriptions: SubscriptionRepository
  ids: IdGenerator
  clock: Clock
}

export function gatewayForMarket(market: Market): PaymentProvider {
  return market === 'BR' ? 'asaas' : 'stripe'
}

export function makeStartCheckout({
  gateways,
  checkoutIntents,
  subscriptions,
  ids,
  clock,
}: Dependencies) {
  return async function startCheckout(
    input: Omit<CheckoutInput, 'trialDays'> & { market: Market },
  ): Promise<CheckoutSession> {
    const { market, ...checkout } = input
    const provider = gatewayForMarket(market)
    const history = await subscriptions.listByUser(asEntityId(input.userId))
    const trialDays = trialDaysFor(input.plan, history.length > 0)
    const session = await gateways[provider].startCheckout({
      ...checkout,
      trialDays,
    })

    if (session.reference) {
      await checkoutIntents.save(
        CheckoutIntent.create({
          id: ids.generate(),
          provider,
          reference: session.reference,
          createdAt: clock.now(),
        }),
      )
    }

    return session
  }
}
