import type { PaymentProvider } from '@lifedeck/domain'
import type {
  CheckoutInput,
  CheckoutSession,
  Market,
  PaymentGateway,
} from '@/ports/payment-gateway'

type Dependencies = {
  gateways: Record<PaymentProvider, PaymentGateway>
}

export function gatewayForMarket(market: Market): PaymentProvider {
  return market === 'BR' ? 'asaas' : 'stripe'
}

export function makeStartCheckout({ gateways }: Dependencies) {
  return async function startCheckout(
    input: CheckoutInput & { market: Market },
  ): Promise<CheckoutSession> {
    const { market, ...checkout } = input
    return gateways[gatewayForMarket(market)].startCheckout(checkout)
  }
}
