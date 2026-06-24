import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PLAN,
  PLANS,
  entitlementsForPlan,
  isPlan,
  planGrants,
  quotaForPlan,
} from '@/value-objects/plan'

describe('plan', () => {
  it('accepts every known plan', () => {
    for (const plan of PLANS) {
      expect(isPlan(plan)).toBe(true)
    }
  })

  it('rejects an unknown plan', () => {
    expect(isPlan('business')).toBe(false)
    expect(isPlan('')).toBe(false)
  })

  it('defaults to the free plan', () => {
    expect(DEFAULT_PLAN).toBe('free')
    expect(isPlan(DEFAULT_PLAN)).toBe(true)
  })

  it('grows entitlements as the plan tier rises', () => {
    expect(entitlementsForPlan('free')).toEqual(['whatsappAssistant'])
    expect(entitlementsForPlan('pro')).toEqual([
      'calendarSync',
      'whatsappAssistant',
    ])
    expect(entitlementsForPlan('premium')).toEqual([
      'calendarSync',
      'whatsappAssistant',
      'premiumModel',
    ])
  })

  it('reports whether a plan grants an entitlement', () => {
    expect(planGrants('free', 'calendarSync')).toBe(false)
    expect(planGrants('free', 'premiumModel')).toBe(false)
    expect(planGrants('pro', 'calendarSync')).toBe(true)
    expect(planGrants('pro', 'premiumModel')).toBe(false)
    expect(planGrants('premium', 'premiumModel')).toBe(true)
  })

  it('exposes a rising credit quota per plan', () => {
    expect(quotaForPlan('free')).toEqual({
      fiveHourCredits: 5,
      weeklyCredits: 15,
    })
    expect(quotaForPlan('pro')).toEqual({
      fiveHourCredits: 40,
      weeklyCredits: 200,
    })
    expect(quotaForPlan('premium')).toEqual({
      fiveHourCredits: 80,
      weeklyCredits: 500,
    })
  })
})
