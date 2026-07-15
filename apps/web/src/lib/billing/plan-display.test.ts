import { describe, expect, it } from 'vitest'
import { messages } from '@lifedeck/i18n'
import type { SubscriptionView } from '@lifedeck/application'
import {
  planName,
  renewLine,
  subscriptionBadge,
} from '@/lib/billing/plan-display'

const en = messages.en

function sub(overrides: Partial<SubscriptionView> = {}): SubscriptionView {
  return {
    plan: 'pro',
    status: 'active',
    provider: 'asaas',
    currentPeriodEnd: '2026-08-03T00:00:00.000Z',
    cancelAtPeriodEnd: false,
    ...overrides,
  }
}

describe('planName', () => {
  it('maps each plan to its localized name', () => {
    expect(planName('free', en)).toBe(en.billing.free)
    expect(planName('pro', en)).toBe(en.billing.pro)
    expect(planName('premium', en)).toBe(en.billing.premium)
    expect(planName('pro', messages.pt)).toBe(messages.pt.billing.pro)
  })
})

describe('subscriptionBadge', () => {
  it('shows active for an active subscription', () => {
    expect(subscriptionBadge(sub(), en)).toEqual({
      label: en.billing.statusActive,
      tone: 'success',
    })
    expect(subscriptionBadge(sub({ status: 'trialing' }), en).tone).toBe(
      'success',
    )
  })

  it('flags a cancellation scheduled for period end', () => {
    expect(subscriptionBadge(sub({ cancelAtPeriodEnd: true }), en)).toEqual({
      label: en.billing.notRenewing,
      tone: 'warning',
    })
  })

  it('maps past_due and canceled statuses', () => {
    expect(subscriptionBadge(sub({ status: 'past_due' }), en)).toEqual({
      label: en.billing.statusPastDue,
      tone: 'warning',
    })
    expect(subscriptionBadge(sub({ status: 'canceled' }), en)).toEqual({
      label: en.billing.statusCanceled,
      tone: 'neutral',
    })
  })

  it('defaults to active when there is no subscription', () => {
    expect(subscriptionBadge(null, en).tone).toBe('success')
  })

  it('defaults unknown statuses to active', () => {
    const weird = sub({ status: 'something' as SubscriptionView['status'] })
    expect(subscriptionBadge(weird, en).tone).toBe('success')
  })
})

describe('renewLine', () => {
  it('reports no charge for the free plan', () => {
    expect(renewLine('free', null, 'en', en)).toBe(en.billing.noCharge)
  })

  it('reports no charge when there is no period end', () => {
    expect(renewLine('pro', sub({ currentPeriodEnd: null }), 'en', en)).toBe(
      en.billing.noCharge,
    )
  })

  it('shows the renewal date for an active paid plan', () => {
    const line = renewLine('pro', sub(), 'en', en)
    expect(line.startsWith(en.billing.renewsOn)).toBe(true)
    expect(line).toContain('2026')
  })

  it('shows the access-until date when cancellation is scheduled', () => {
    const line = renewLine(
      'pro',
      sub({ cancelAtPeriodEnd: true }),
      'pt',
      messages.pt,
    )
    expect(line.startsWith(messages.pt.billing.accessUntil)).toBe(true)
    expect(line).toContain('2026')
  })
})
