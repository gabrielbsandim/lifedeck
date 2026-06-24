import { describe, expect, it, vi } from 'vitest'
import { gatewayForMarket, makeStartCheckout } from '@/use-cases/start-checkout'
import type { PaymentGateway } from '@/ports/payment-gateway'

function fakeGateway(
  provider: 'asaas' | 'stripe',
  url: string,
): PaymentGateway {
  return {
    provider,
    startCheckout: vi.fn().mockResolvedValue({ url }),
    parseWebhook: vi.fn().mockResolvedValue(null),
  }
}

const checkout = {
  userId: 'u1',
  email: 'a@b.com',
  plan: 'pro' as const,
  interval: 'monthly' as const,
  successUrl: 'https://s',
  cancelUrl: 'https://c',
}

describe('gatewayForMarket', () => {
  it('routes Brazil to Asaas and international to Stripe', () => {
    expect(gatewayForMarket('BR')).toBe('asaas')
    expect(gatewayForMarket('INTL')).toBe('stripe')
  })
})

describe('startCheckout', () => {
  it('uses Asaas for the Brazilian market', async () => {
    const asaas = fakeGateway('asaas', 'https://asaas/pay')
    const stripe = fakeGateway('stripe', 'https://stripe/pay')
    const start = makeStartCheckout({ gateways: { asaas, stripe } })

    const session = await start({ ...checkout, market: 'BR' })

    expect(session.url).toBe('https://asaas/pay')
    expect(asaas.startCheckout).toHaveBeenCalledWith(checkout)
    expect(stripe.startCheckout).not.toHaveBeenCalled()
  })

  it('uses Stripe for the international market', async () => {
    const asaas = fakeGateway('asaas', 'https://asaas/pay')
    const stripe = fakeGateway('stripe', 'https://stripe/pay')
    const start = makeStartCheckout({ gateways: { asaas, stripe } })

    const session = await start({ ...checkout, market: 'INTL' })

    expect(session.url).toBe('https://stripe/pay')
    expect(stripe.startCheckout).toHaveBeenCalledWith(checkout)
  })
})
