export const PAYMENT_PROVIDERS = ['asaas', 'stripe'] as const

export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number]

export function isPaymentProvider(value: string): value is PaymentProvider {
  return (PAYMENT_PROVIDERS as readonly string[]).includes(value)
}
