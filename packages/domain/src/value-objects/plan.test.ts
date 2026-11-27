import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PLAN,
  PLANS,
  PRO_TRIAL_DAYS,
  entitlementsForPlan,
  isPlan,
  planGrants,
  planRank,
  quotaForPlan,
  trialDaysFor,
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
      'proactiveMessaging',
      'booking',
    ])
    expect(entitlementsForPlan('premium')).toEqual([
      'calendarSync',
      'whatsappAssistant',
      'premiumModel',
      'proactiveMessaging',
      'smartScheduling',
      'booking',
    ])
  })

  it('reports whether a plan grants an entitlement', () => {
    expect(planGrants('free', 'calendarSync')).toBe(false)
    expect(planGrants('free', 'premiumModel')).toBe(false)
    expect(planGrants('pro', 'calendarSync')).toBe(true)
    expect(planGrants('pro', 'premiumModel')).toBe(false)
    expect(planGrants('premium', 'premiumModel')).toBe(true)
  })

  it('gates proactive messaging to paid plans and smart scheduling to premium', () => {
    expect(planGrants('free', 'proactiveMessaging')).toBe(false)
    expect(planGrants('pro', 'proactiveMessaging')).toBe(true)
    expect(planGrants('premium', 'proactiveMessaging')).toBe(true)

    expect(planGrants('free', 'smartScheduling')).toBe(false)
    expect(planGrants('pro', 'smartScheduling')).toBe(false)
    expect(planGrants('premium', 'smartScheduling')).toBe(true)

    expect(planGrants('free', 'booking')).toBe(false)
    expect(planGrants('pro', 'booking')).toBe(true)
  })

  it('exposes a rising credit quota per plan', () => {
    expect(quotaForPlan('free')).toEqual({
      fiveHourCredits: 15,
      weeklyCredits: 50,
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

  it('grants the whatsapp assistant taster on every plan, including free', () => {
    for (const plan of PLANS) {
      expect(planGrants(plan, 'whatsappAssistant')).toBe(true)
    }
  })

  it('ranks plans from free up to premium', () => {
    expect(planRank('free')).toBe(0)
    expect(planRank('pro')).toBeGreaterThan(planRank('free'))
    expect(planRank('premium')).toBeGreaterThan(planRank('pro'))
  })

  it('gives a first time Pro subscriber a 7 day trial and nobody else', () => {
    expect(trialDaysFor('pro', false)).toBe(PRO_TRIAL_DAYS)
    expect(PRO_TRIAL_DAYS).toBe(7)
    expect(trialDaysFor('pro', true)).toBe(0)
    expect(trialDaysFor('premium', false)).toBe(0)
    expect(trialDaysFor('free', false)).toBe(0)
  })
})
