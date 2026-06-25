import { describe, expect, it, vi } from 'vitest'
import { asEntityId } from '@lifedeck/domain'
import { gatewayForMarket, makeStartCheckout } from '@/use-cases/start-checkout'
import { InMemoryCheckoutIntentRepository } from '@/testing/in-memory-checkout-intent-repository'
import type { PaymentGateway } from '@/ports/payment-gateway'

const INTENT_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const ids = { generate: () => asEntityId(INTENT_ID) }
const clock = { now: () => new Date('2026-06-24T10:00:00.000Z') }

function fakeGateway(
  provider: 'asaas' | 'stripe',
  url: string,
  reference: string | null = null,
): PaymentGateway {
  return {
    provider,
    startCheckout: vi.fn().mockResolvedValue({ url, reference }),
    parseWebhook: vi.fn().mockResolvedValue(null),
  }
}

function deps(asaas: PaymentGateway, stripe: PaymentGateway) {
  return {
    gateways: { asaas, stripe },
    checkoutIntents: new InMemoryCheckoutIntentRepository(),
    ids,
    clock,
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
    const start = makeStartCheckout(deps(asaas, stripe))

    const session = await start({ ...checkout, market: 'BR' })

    expect(session.url).toBe('https://asaas/pay')
    expect(asaas.startCheckout).toHaveBeenCalledWith(checkout)
    expect(stripe.startCheckout).not.toHaveBeenCalled()
  })

  it('uses Stripe for the international market', async () => {
    const asaas = fakeGateway('asaas', 'https://asaas/pay')
    const stripe = fakeGateway('stripe', 'https://stripe/pay')
    const start = makeStartCheckout(deps(asaas, stripe))

    const session = await start({ ...checkout, market: 'INTL' })

    expect(session.url).toBe('https://stripe/pay')
    expect(stripe.startCheckout).toHaveBeenCalledWith(checkout)
  })

  it('records a checkout intent for the reference the gateway minted', async () => {
    const asaas = fakeGateway('asaas', 'https://asaas/pay', 'u1|pro|monthly')
    const stripe = fakeGateway('stripe', 'https://stripe/pay')
    const checkoutIntents = new InMemoryCheckoutIntentRepository()
    const start = makeStartCheckout({
      gateways: { asaas, stripe },
      checkoutIntents,
      ids,
      clock,
    })

    await start({ ...checkout, market: 'BR' })

    const intent = await checkoutIntents.findByReference(
      'asaas',
      'u1|pro|monthly',
    )
    expect(intent?.reference).toBe('u1|pro|monthly')
  })

  it('records no intent when the gateway returns no reference', async () => {
    const asaas = fakeGateway('asaas', 'https://asaas/pay')
    const stripe = fakeGateway('stripe', 'https://stripe/pay')
    const checkoutIntents = new InMemoryCheckoutIntentRepository()
    const start = makeStartCheckout({
      gateways: { asaas, stripe },
      checkoutIntents,
      ids,
      clock,
    })

    await start({ ...checkout, market: 'INTL' })

    expect(await checkoutIntents.findByReference('stripe', '')).toBeNull()
  })
})
