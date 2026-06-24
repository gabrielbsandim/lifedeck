import { describe, expect, it } from 'vitest'
import {
  PAYMENT_PROVIDERS,
  isPaymentProvider,
} from '@/value-objects/payment-provider'

describe('payment-provider', () => {
  it('accepts every known provider', () => {
    for (const provider of PAYMENT_PROVIDERS) {
      expect(isPaymentProvider(provider)).toBe(true)
    }
  })

  it('rejects an unknown provider', () => {
    expect(isPaymentProvider('paypal')).toBe(false)
    expect(isPaymentProvider('')).toBe(false)
  })
})
