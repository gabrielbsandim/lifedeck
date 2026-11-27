import type { Entitlement } from '@/value-objects/entitlement'

export const PLANS = ['free', 'pro', 'premium'] as const

export type Plan = (typeof PLANS)[number]

export const DEFAULT_PLAN: Plan = 'free'

export function isPlan(value: string): value is Plan {
  return (PLANS as readonly string[]).includes(value)
}

// Ordinal weight of a plan (free < pro < premium), so callers can pick the
// highest-value plan when a user somehow holds more than one subscription.
export function planRank(plan: Plan): number {
  return PLANS.indexOf(plan)
}

export type PlanQuota = {
  fiveHourCredits: number
  weeklyCredits: number
}

type PlanDefinition = {
  entitlements: readonly Entitlement[]
  quota: PlanQuota
}

const PLAN_CATALOG: Record<Plan, PlanDefinition> = {
  free: {
    entitlements: ['whatsappAssistant'],
    quota: { fiveHourCredits: 15, weeklyCredits: 50 },
  },
  pro: {
    entitlements: [
      'calendarSync',
      'whatsappAssistant',
      'proactiveMessaging',
      'booking',
    ],
    quota: { fiveHourCredits: 40, weeklyCredits: 200 },
  },
  premium: {
    entitlements: [
      'calendarSync',
      'whatsappAssistant',
      'premiumModel',
      'proactiveMessaging',
      'smartScheduling',
      'booking',
    ],
    quota: { fiveHourCredits: 80, weeklyCredits: 500 },
  },
}

export function entitlementsForPlan(plan: Plan): readonly Entitlement[] {
  return PLAN_CATALOG[plan].entitlements
}

export function planGrants(plan: Plan, entitlement: Entitlement): boolean {
  return PLAN_CATALOG[plan].entitlements.includes(entitlement)
}

export function quotaForPlan(plan: Plan): PlanQuota {
  return PLAN_CATALOG[plan].quota
}

export const PRO_TRIAL_DAYS = 7

// One trial per person: anyone who ever held a subscription, even a canceled
// one, pays from day one, so cancel and resubscribe cannot farm free weeks.
export function trialDaysFor(
  plan: Plan,
  hasSubscriptionHistory: boolean,
): number {
  if (plan !== 'pro' || hasSubscriptionHistory) {
    return 0
  }
  return PRO_TRIAL_DAYS
}
