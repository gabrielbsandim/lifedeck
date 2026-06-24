import { describe, expect, it } from 'vitest'
import {
  SUBSCRIPTION_STATUSES,
  isSubscriptionStatus,
} from '@/value-objects/subscription-status'

describe('subscription-status', () => {
  it('accepts every known status', () => {
    for (const status of SUBSCRIPTION_STATUSES) {
      expect(isSubscriptionStatus(status)).toBe(true)
    }
  })

  it('rejects an unknown status', () => {
    expect(isSubscriptionStatus('expired')).toBe(false)
    expect(isSubscriptionStatus('')).toBe(false)
  })
})
