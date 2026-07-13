import { createHmac, timingSafeEqual } from 'node:crypto'
import { httpFetch } from '@/http/http-fetch'
import { isPlan, type Plan, type SubscriptionStatus } from '@lifedeck/domain'
import type {
  CheckoutInput,
  CheckoutSession,
  PaymentGateway,
  SubscriptionEvent,
} from '@lifedeck/application'

type StripeConfig = {
  secretKey: string
  webhookSecret: string
  prices: Record<string, string>
}

function readConfig(): StripeConfig {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY env var is not set')
  }
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET env var is not set')
  }
  return {
    secretKey,
    webhookSecret,
    prices: {
      PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY ?? '',
      PRO_ANNUAL: process.env.STRIPE_PRICE_PRO_ANNUAL ?? '',
      PREMIUM_MONTHLY: process.env.STRIPE_PRICE_PREMIUM_MONTHLY ?? '',
      PREMIUM_ANNUAL: process.env.STRIPE_PRICE_PREMIUM_ANNUAL ?? '',
    },
  }
}

function mapStatus(status: string): SubscriptionStatus {
  switch (status) {
    case 'trialing':
      return 'trialing'
    case 'active':
      return 'active'
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
      return 'past_due'
    default:
      return 'canceled'
  }
}

function asPlan(value: unknown): Plan | null {
  return typeof value === 'string' && isPlan(value) ? value : null
}

function periodEnd(subscription: Record<string, unknown>): Date | null {
  const top = subscription.current_period_end
  if (typeof top === 'number') {
    return new Date(top * 1000)
  }
  const items = subscription.items as { data?: unknown[] } | undefined
  const first = items?.data?.[0] as { current_period_end?: unknown } | undefined
  return typeof first?.current_period_end === 'number'
    ? new Date(first.current_period_end * 1000)
    : null
}

export class StripePaymentGateway implements PaymentGateway {
  readonly provider = 'stripe' as const

  async startCheckout(input: CheckoutInput): Promise<CheckoutSession> {
    const config = readConfig()
    const priceId =
      config.prices[
        `${input.plan.toUpperCase()}_${input.interval === 'annual' ? 'ANNUAL' : 'MONTHLY'}`
      ]
    if (!priceId) {
      throw new Error(
        `No Stripe price configured for ${input.plan} ${input.interval}`,
      )
    }

    const form = new URLSearchParams()
    form.set('mode', 'subscription')
    form.set('line_items[0][price]', priceId)
    form.set('line_items[0][quantity]', '1')
    form.set('success_url', input.successUrl)
    form.set('cancel_url', input.cancelUrl)
    form.set('client_reference_id', input.userId)
    form.set('subscription_data[metadata][userId]', input.userId)
    form.set('subscription_data[metadata][plan]', input.plan)
    form.set('metadata[userId]', input.userId)
    form.set('metadata[plan]', input.plan)
    if (input.email) {
      form.set('customer_email', input.email)
    }

    const response = await httpFetch(
      'https://api.stripe.com/v1/checkout/sessions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      },
    )
    if (!response.ok) {
      throw new Error(`Stripe checkout failed with status ${response.status}`)
    }
    const session = (await response.json()) as { url: string | null }
    if (!session.url) {
      throw new Error('Stripe checkout session has no redirect URL')
    }
    return { url: session.url, reference: null }
  }

  async parseWebhook(
    rawBody: string,
    signature: string | null,
  ): Promise<SubscriptionEvent | null> {
    const config = readConfig()
    if (!verifySignature(rawBody, signature, config.webhookSecret)) {
      return null
    }

    const event = JSON.parse(rawBody) as {
      type: string
      data: { object: Record<string, unknown> }
    }
    const object = event.data.object

    if (event.type === 'checkout.session.completed') {
      const providerRef = object.subscription
      if (typeof providerRef !== 'string') {
        return null
      }
      const metadata = (object.metadata ?? {}) as Record<string, unknown>
      return {
        providerRef,
        userId:
          typeof object.client_reference_id === 'string'
            ? object.client_reference_id
            : typeof metadata.userId === 'string'
              ? metadata.userId
              : null,
        plan: asPlan(metadata.plan),
        status: 'active',
        currentPeriodEnd: null,
        reference: null,
      }
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const providerRef = object.id
      if (typeof providerRef !== 'string') {
        return null
      }
      const metadata = (object.metadata ?? {}) as Record<string, unknown>
      const status =
        event.type === 'customer.subscription.deleted'
          ? 'canceled'
          : mapStatus(String(object.status))
      return {
        providerRef,
        userId: typeof metadata.userId === 'string' ? metadata.userId : null,
        plan: asPlan(metadata.plan),
        status,
        currentPeriodEnd: periodEnd(object),
        cancelAtPeriodEnd: object.cancel_at_period_end === true,
        reference: null,
      }
    }

    return null
  }

  async cancelSubscription(providerRef: string): Promise<void> {
    const config = readConfig()
    const form = new URLSearchParams()
    form.set('cancel_at_period_end', 'true')
    const response = await httpFetch(
      `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(providerRef)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      },
    )
    if (!response.ok && response.status !== 404) {
      throw new Error(`Stripe cancel failed with status ${response.status}`)
    }
  }
}

function verifySignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) {
    return false
  }
  const parts = Object.fromEntries(
    signature.split(',').map(part => part.split('=') as [string, string]),
  )
  const timestamp = parts.t
  const provided = parts.v1
  if (!timestamp || !provided) {
    return false
  }
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    return false
  }
  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(provided)
  return a.length === b.length && timingSafeEqual(a, b)
}
