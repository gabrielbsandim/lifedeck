import { timingSafeEqual } from 'node:crypto'
import { httpFetch } from '@/http/http-fetch'
import { isPlan, type Plan, type SubscriptionStatus } from '@lifedeck/domain'
import type {
  CheckoutInput,
  CheckoutSession,
  PaymentGateway,
  PaymentInterval,
  SubscriptionEvent,
} from '@lifedeck/application'

type AsaasConfig = {
  baseUrl: string
  apiKey: string
  webhookToken: string
  values: Record<string, string>
}

function readConfig(): AsaasConfig {
  const baseUrl = process.env.ASAAS_BASE_URL
  const apiKey = process.env.ASAAS_API_KEY
  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN
  if (!baseUrl) {
    throw new Error('ASAAS_BASE_URL env var is not set')
  }
  if (!apiKey) {
    throw new Error('ASAAS_API_KEY env var is not set')
  }
  if (!webhookToken) {
    throw new Error('ASAAS_WEBHOOK_TOKEN env var is not set')
  }
  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    apiKey,
    webhookToken,
    values: {
      PRO_MONTHLY: process.env.ASAAS_VALUE_PRO_MONTHLY ?? '',
      PRO_ANNUAL: process.env.ASAAS_VALUE_PRO_ANNUAL ?? '',
      PREMIUM_MONTHLY: process.env.ASAAS_VALUE_PREMIUM_MONTHLY ?? '',
      PREMIUM_ANNUAL: process.env.ASAAS_VALUE_PREMIUM_ANNUAL ?? '',
    },
  }
}

function tokensMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

const REFERENCE_SEPARATOR = '|'

function encodeReference(input: CheckoutInput): string {
  return [input.userId, input.plan, input.interval].join(REFERENCE_SEPARATOR)
}

function decodeReference(reference: unknown): {
  userId: string | null
  plan: Plan | null
  interval: PaymentInterval
} {
  if (typeof reference !== 'string') {
    return { userId: null, plan: null, interval: 'monthly' }
  }
  const [userId, plan, interval] = reference.split(REFERENCE_SEPARATOR)
  return {
    userId: userId || null,
    plan: plan && isPlan(plan) ? plan : null,
    interval: interval === 'annual' ? 'annual' : 'monthly',
  }
}

function mapStatus(event: string): SubscriptionStatus | null {
  switch (event) {
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED':
      return 'active'
    case 'PAYMENT_OVERDUE':
    case 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED':
      return 'past_due'
    case 'PAYMENT_REFUNDED':
    case 'SUBSCRIPTION_DELETED':
      return 'canceled'
    default:
      return null
  }
}

function paidThrough(dueDate: unknown, interval: PaymentInterval): Date | null {
  if (typeof dueDate !== 'string') {
    return null
  }
  const anchor = new Date(dueDate)
  if (Number.isNaN(anchor.getTime())) {
    return null
  }
  const end = new Date(anchor)
  if (interval === 'annual') {
    end.setUTCFullYear(end.getUTCFullYear() + 1)
  } else {
    end.setUTCMonth(end.getUTCMonth() + 1)
  }
  return end
}

// The exact paid-through date Asaas will next charge on. Used instead of
// guessing the interval, so an annual subscription is not treated as monthly.
async function fetchNextDueDate(
  config: AsaasConfig,
  subscriptionId: string,
): Promise<Date | null> {
  try {
    const response = await httpFetch(
      `${config.baseUrl}/v3/subscriptions/${encodeURIComponent(subscriptionId)}`,
      { headers: { access_token: config.apiKey } },
    )
    if (!response.ok) {
      return null
    }
    const data = (await response.json()) as { nextDueDate?: unknown }
    if (typeof data.nextDueDate !== 'string') {
      return null
    }
    const date = new Date(data.nextDueDate)
    return Number.isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

export class AsaasPaymentGateway implements PaymentGateway {
  readonly provider = 'asaas' as const

  async startCheckout(input: CheckoutInput): Promise<CheckoutSession> {
    const config = readConfig()
    const reference = encodeReference(input)
    const value =
      config.values[
        `${input.plan.toUpperCase()}_${input.interval === 'annual' ? 'ANNUAL' : 'MONTHLY'}`
      ]
    if (!value) {
      throw new Error(
        `No Asaas value configured for ${input.plan} ${input.interval}`,
      )
    }
    // Asaas charges the raw `value` in reais (decimal). A locale-formatted env
    // ("29,90") parses to NaN and a cents value ("2990") would overcharge 100x,
    // so refuse anything that is not a sane positive amount rather than sending
    // a broken or wrong charge.
    const amount = Number(value)
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(
        `Invalid Asaas amount "${value}" for ${input.plan} ${input.interval}; expected reais with a dot decimal`,
      )
    }

    const response = await httpFetch(`${config.baseUrl}/v3/paymentLinks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: config.apiKey,
      },
      body: JSON.stringify({
        name: `Lifedeck ${input.plan}`,
        description: `Lifedeck: assinatura ${input.interval === 'annual' ? 'anual' : 'mensal'}`,
        billingType: 'UNDEFINED',
        chargeType: 'RECURRENT',
        subscriptionCycle: input.interval === 'annual' ? 'YEARLY' : 'MONTHLY',
        value: amount,
        externalReference: reference,
        callback: { successUrl: input.successUrl, autoRedirect: true },
      }),
    })
    if (!response.ok) {
      throw new Error(`Asaas checkout failed with status ${response.status}`)
    }
    const link = (await response.json()) as { url?: string }
    if (!link.url) {
      throw new Error('Asaas payment link has no URL')
    }
    return { url: link.url, reference }
  }

  async parseWebhook(
    rawBody: string,
    signature: string | null,
  ): Promise<SubscriptionEvent | null> {
    const config = readConfig()
    if (!signature || !tokensMatch(signature, config.webhookToken)) {
      return null
    }

    const payload = JSON.parse(rawBody) as {
      event: string
      payment?: {
        subscription?: string
        externalReference?: string
        dueDate?: string
      }
      subscription?: { id?: string; externalReference?: string }
    }

    const providerRef =
      payload.payment?.subscription ?? payload.subscription?.id ?? null
    if (!providerRef) {
      return null
    }

    const status = mapStatus(payload.event)
    if (!status) {
      return null
    }

    const rawReference =
      payload.payment?.externalReference ??
      payload.subscription?.externalReference ??
      null
    const reference = decodeReference(rawReference)

    // The billing interval is only carried on externalReference, which Asaas may
    // not propagate onto auto-generated renewal charges; defaulting to monthly
    // would cut an annual subscriber's access ~11 months short. Read the exact
    // paid-through date from the subscription itself, falling back to the
    // interval-based estimate only if the lookup fails.
    let currentPeriodEnd: Date | null = null
    if (status === 'active') {
      currentPeriodEnd =
        (await fetchNextDueDate(config, providerRef)) ??
        paidThrough(payload.payment?.dueDate, reference.interval)
    }

    return {
      providerRef,
      userId: reference.userId,
      plan: reference.plan,
      status,
      currentPeriodEnd,
      reference: rawReference,
    }
  }

  async cancelSubscription(providerRef: string): Promise<void> {
    const config = readConfig()
    const response = await httpFetch(
      `${config.baseUrl}/v3/subscriptions/${encodeURIComponent(providerRef)}`,
      {
        method: 'DELETE',
        headers: { access_token: config.apiKey },
      },
    )
    // A 404 means the subscription is already gone on Asaas; treat as success.
    if (!response.ok && response.status !== 404) {
      throw new Error(`Asaas cancel failed with status ${response.status}`)
    }
  }
}
