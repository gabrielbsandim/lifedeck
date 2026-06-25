import { CheckoutIntent, type PaymentProvider } from '@lifedeck/domain'
import type { CheckoutIntentRepository } from '@/ports/checkout-intent-repository'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type {
  CheckoutInput,
  CheckoutSession,
  Market,
  PaymentGateway,
} from '@/ports/payment-gateway'

type Dependencies = {
  gateways: Record<PaymentProvider, PaymentGateway>
  checkoutIntents: CheckoutIntentRepository
  ids: IdGenerator
  clock: Clock
}

export function gatewayForMarket(market: Market): PaymentProvider {
  return market === 'BR' ? 'asaas' : 'stripe'
}

export function makeStartCheckout({
  gateways,
  checkoutIntents,
  ids,
  clock,
}: Dependencies) {
  return async function startCheckout(
    input: CheckoutInput & { market: Market },
  ): Promise<CheckoutSession> {
    const { market, ...checkout } = input
    const provider = gatewayForMarket(market)
    const session = await gateways[provider].startCheckout(checkout)

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
