import type {
  PaymentProvider,
  Plan,
  SubscriptionStatus,
} from '@lifedeck/domain'

export type PaymentInterval = 'monthly' | 'annual'

export type Market = 'BR' | 'INTL'

export type CheckoutInput = {
  userId: string
  email: string | null
  plan: Plan
  interval: PaymentInterval
  successUrl: string
  cancelUrl: string
}

export type CheckoutSession = {
  url: string
  reference: string | null
}

export type SubscriptionEvent = {
  providerRef: string
  userId: string | null
  plan: Plan | null
  status: SubscriptionStatus
  currentPeriodEnd: Date | null
  reference: string | null
}

export interface PaymentGateway {
  readonly provider: PaymentProvider
  startCheckout(input: CheckoutInput): Promise<CheckoutSession>
  parseWebhook(
    rawBody: string,
    signature: string | null,
  ): Promise<SubscriptionEvent | null>
}
