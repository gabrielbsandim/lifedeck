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
  cancelAtPeriodEnd?: boolean
  reference: string | null
}

export interface PaymentGateway {
  readonly provider: PaymentProvider
  startCheckout(input: CheckoutInput): Promise<CheckoutSession>
  parseWebhook(
    rawBody: string,
    signature: string | null,
  ): Promise<SubscriptionEvent | null>
  // Cancel at period end; the provider keeps access until currentPeriodEnd and
  // then emits a webhook that flips the local status to canceled.
  cancelSubscription(providerRef: string): Promise<void>
}

// ── In-app local payments (Asaas / BR) ──────────────────────────────────────
// Unlike the hosted-redirect flow above, these create the subscription directly
// so we can render a Pix QR code or take card details in our own UI. Activation
// still happens through the shared webhook once the payment is confirmed.

export type LocalCustomerInput = {
  name: string
  email: string | null
  cpfCnpj: string
  phone?: string | null
  postalCode?: string | null
  addressNumber?: string | null
}

export type LocalSubscriptionInput = {
  customerId: string
  userId: string
  plan: Plan
  interval: PaymentInterval
}

export type PixCharge = {
  subscriptionRef: string
  paymentId: string
  encodedImage: string
  payload: string
  expiresAt: string | null
  reference: string
}

export type CardInput = {
  holderName: string
  number: string
  expiryMonth: string
  expiryYear: string
  ccv: string
}

export type CardHolderInfo = {
  name: string
  email: string | null
  cpfCnpj: string
  postalCode: string
  addressNumber: string
  phone: string | null
}

export type CardSubscriptionResult = {
  subscriptionRef: string
  reference: string
}

export interface LocalPaymentGateway extends PaymentGateway {
  // Create (or return) the provider customer for this person. CPF is required by
  // Asaas for Pix and card; we pass it through and never store it locally.
  createCustomer(input: LocalCustomerInput): Promise<string>
  createPixSubscription(input: LocalSubscriptionInput): Promise<PixCharge>
  createCardSubscription(
    input: LocalSubscriptionInput & {
      card: CardInput
      holder: CardHolderInfo
      remoteIp: string
    },
  ): Promise<CardSubscriptionResult>
}
