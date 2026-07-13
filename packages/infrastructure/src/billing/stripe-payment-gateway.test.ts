import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StripePaymentGateway } from '@/billing/stripe-payment-gateway'
import type { CheckoutInput } from '@lifedeck/application'

const SECRET = 'whsec_test'

function setEnv() {
  process.env.STRIPE_SECRET_KEY = 'sk_test'
  process.env.STRIPE_WEBHOOK_SECRET = SECRET
  process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_pro_m'
  process.env.STRIPE_PRICE_PRO_ANNUAL = 'price_pro_y'
  process.env.STRIPE_PRICE_PREMIUM_MONTHLY = 'price_prem_m'
  process.env.STRIPE_PRICE_PREMIUM_ANNUAL = 'price_prem_y'
}

function clearEnv() {
  for (const key of [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PRICE_PRO_MONTHLY',
    'STRIPE_PRICE_PRO_ANNUAL',
    'STRIPE_PRICE_PREMIUM_MONTHLY',
    'STRIPE_PRICE_PREMIUM_ANNUAL',
  ]) {
    delete process.env[key]
  }
}

function jsonResponse(data: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => data, text: async () => '' }
}

function stub(handler: (url: string, init?: RequestInit) => unknown) {
  const mock = vi.fn((url: string, init?: RequestInit) =>
    Promise.resolve(handler(url, init) as Response),
  )
  vi.stubGlobal('fetch', mock)
  return mock
}

function sign(body: string, ts = Math.floor(Date.now() / 1000)): string {
  const v1 = createHmac('sha256', SECRET).update(`${ts}.${body}`).digest('hex')
  return `t=${ts},v1=${v1}`
}

const checkout: CheckoutInput = {
  userId: 'user-1',
  email: 'gab@example.com',
  plan: 'pro',
  interval: 'monthly',
  successUrl: 'https://app/success',
  cancelUrl: 'https://app/cancel',
}

describe('StripePaymentGateway', () => {
  beforeEach(() => {
    setEnv()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    clearEnv()
  })

  describe('config', () => {
    it('throws without a secret key', async () => {
      delete process.env.STRIPE_SECRET_KEY
      await expect(
        new StripePaymentGateway().cancelSubscription('sub_1'),
      ).rejects.toThrow(/STRIPE_SECRET_KEY/)
    })

    it('throws without a webhook secret', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET
      await expect(
        new StripePaymentGateway().cancelSubscription('sub_1'),
      ).rejects.toThrow(/STRIPE_WEBHOOK_SECRET/)
    })
  })

  describe('startCheckout', () => {
    it('opens a checkout session with the mapped price and metadata', async () => {
      const mock = stub(() => jsonResponse({ url: 'https://stripe/pay' }))
      const result = await new StripePaymentGateway().startCheckout(checkout)

      expect(result).toEqual({ url: 'https://stripe/pay', reference: null })
      const [url, init] = mock.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://api.stripe.com/v1/checkout/sessions')
      const body = init.body as string
      expect(body).toContain('line_items%5B0%5D%5Bprice%5D=price_pro_m')
      expect(body).toContain('client_reference_id=user-1')
      expect(body).toContain('customer_email=gab%40example.com')
    })

    it('maps the premium annual price', async () => {
      const mock = stub(() => jsonResponse({ url: 'https://stripe/pay' }))
      await new StripePaymentGateway().startCheckout({
        ...checkout,
        plan: 'premium',
        interval: 'annual',
      })
      const body = (mock.mock.calls[0] as [string, RequestInit])[1]
        .body as string
      expect(body).toContain('price_prem_y')
    })

    it('omits the email when none is given', async () => {
      const mock = stub(() => jsonResponse({ url: 'https://stripe/pay' }))
      await new StripePaymentGateway().startCheckout({
        ...checkout,
        email: null,
      })
      const body = (mock.mock.calls[0] as [string, RequestInit])[1]
        .body as string
      expect(body).not.toContain('customer_email')
    })

    it('throws when no price is configured', async () => {
      delete process.env.STRIPE_PRICE_PRO_MONTHLY
      await expect(
        new StripePaymentGateway().startCheckout(checkout),
      ).rejects.toThrow(/No Stripe price configured/)
    })

    it('throws when Stripe rejects the request', async () => {
      stub(() => jsonResponse({}, false, 400))
      await expect(
        new StripePaymentGateway().startCheckout(checkout),
      ).rejects.toThrow(/status 400/)
    })

    it('throws when the session has no url', async () => {
      stub(() => jsonResponse({ url: null }))
      await expect(
        new StripePaymentGateway().startCheckout(checkout),
      ).rejects.toThrow(/no redirect URL/)
    })
  })

  describe('parseWebhook signature', () => {
    const gw = () => new StripePaymentGateway()
    const body = JSON.stringify({ type: 'unknown', data: { object: {} } })

    it('rejects a null signature', async () => {
      expect(await gw().parseWebhook(body, null)).toBeNull()
    })

    it('rejects a malformed signature header', async () => {
      expect(await gw().parseWebhook(body, 'garbage')).toBeNull()
    })

    it('rejects a stale timestamp', async () => {
      const ts = Math.floor(Date.now() / 1000) - 400
      expect(await gw().parseWebhook(body, sign(body, ts))).toBeNull()
    })

    it('rejects a tampered body', async () => {
      const signature = sign(body)
      expect(await gw().parseWebhook('{"type":"x"}', signature)).toBeNull()
    })

    it('returns null for a valid but unhandled event type', async () => {
      expect(await gw().parseWebhook(body, sign(body))).toBeNull()
    })
  })

  describe('parseWebhook events', () => {
    const gw = () => new StripePaymentGateway()

    async function parse(event: unknown) {
      const body = JSON.stringify(event)
      return gw().parseWebhook(body, sign(body))
    }

    it('parses checkout.session.completed with client_reference_id', async () => {
      const result = await parse({
        type: 'checkout.session.completed',
        data: {
          object: {
            subscription: 'sub_1',
            client_reference_id: 'user-1',
            metadata: { plan: 'pro' },
          },
        },
      })
      expect(result).toMatchObject({
        providerRef: 'sub_1',
        userId: 'user-1',
        plan: 'pro',
        status: 'active',
        currentPeriodEnd: null,
      })
    })

    it('falls back to metadata.userId on checkout completion', async () => {
      const result = await parse({
        type: 'checkout.session.completed',
        data: {
          object: {
            subscription: 'sub_1',
            metadata: { userId: 'user-2', plan: 'premium' },
          },
        },
      })
      expect(result?.userId).toBe('user-2')
      expect(result?.plan).toBe('premium')
    })

    it('yields a null user and plan when the completion has neither id nor metadata', async () => {
      const result = await parse({
        type: 'checkout.session.completed',
        data: { object: { subscription: 'sub_1' } },
      })
      expect(result).toMatchObject({
        providerRef: 'sub_1',
        userId: null,
        plan: null,
      })
    })

    it('ignores checkout completion without a subscription id', async () => {
      const result = await parse({
        type: 'checkout.session.completed',
        data: { object: { metadata: {} } },
      })
      expect(result).toBeNull()
    })

    it('parses a subscription update with a top-level period end', async () => {
      const result = await parse({
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_1',
            status: 'active',
            current_period_end: 1793000000,
            cancel_at_period_end: true,
            metadata: { userId: 'user-1', plan: 'pro' },
          },
        },
      })
      expect(result).toMatchObject({
        providerRef: 'sub_1',
        status: 'active',
        cancelAtPeriodEnd: true,
      })
      expect(result?.currentPeriodEnd).toEqual(new Date(1793000000 * 1000))
    })

    it('reads the period end from the first item when top-level is absent', async () => {
      const result = await parse({
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_1',
            status: 'trialing',
            items: { data: [{ current_period_end: 1793000000 }] },
            metadata: { userId: 'user-1', plan: 'pro' },
          },
        },
      })
      expect(result?.status).toBe('trialing')
      expect(result?.currentPeriodEnd).toEqual(new Date(1793000000 * 1000))
    })

    it('maps a deleted subscription to canceled with no period end', async () => {
      const result = await parse({
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_1',
            status: 'active',
            metadata: { userId: 'user-1', plan: 'pro' },
          },
        },
      })
      expect(result?.status).toBe('canceled')
      expect(result?.currentPeriodEnd).toBeNull()
    })

    it('maps unpaid/incomplete statuses to past_due and default to canceled', async () => {
      const pastDue = await parse({
        type: 'customer.subscription.updated',
        data: { object: { id: 'sub_1', status: 'unpaid', metadata: {} } },
      })
      expect(pastDue?.status).toBe('past_due')

      const canceled = await parse({
        type: 'customer.subscription.updated',
        data: { object: { id: 'sub_1', status: 'paused', metadata: {} } },
      })
      expect(canceled?.status).toBe('canceled')
    })

    it('ignores a subscription event without an id', async () => {
      const result = await parse({
        type: 'customer.subscription.updated',
        data: { object: { status: 'active', metadata: {} } },
      })
      expect(result).toBeNull()
    })

    it('nulls an unrecognized plan in metadata', async () => {
      const result = await parse({
        type: 'customer.subscription.updated',
        data: {
          object: { id: 'sub_1', status: 'active', metadata: { plan: 'gold' } },
        },
      })
      expect(result?.plan).toBeNull()
    })
  })

  describe('cancelSubscription', () => {
    it('sends cancel_at_period_end', async () => {
      const mock = stub(() => jsonResponse({}, true, 200))
      await new StripePaymentGateway().cancelSubscription('sub_1')
      const [url, init] = mock.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://api.stripe.com/v1/subscriptions/sub_1')
      expect(init.body).toContain('cancel_at_period_end=true')
    })

    it('treats a 404 as already canceled', async () => {
      stub(() => jsonResponse({}, false, 404))
      await expect(
        new StripePaymentGateway().cancelSubscription('sub_1'),
      ).resolves.toBeUndefined()
    })

    it('throws on other failures', async () => {
      stub(() => jsonResponse({}, false, 500))
      await expect(
        new StripePaymentGateway().cancelSubscription('sub_1'),
      ).rejects.toThrow(/status 500/)
    })
  })
})
