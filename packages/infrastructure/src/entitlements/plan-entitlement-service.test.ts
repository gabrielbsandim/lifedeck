import { describe, expect, it } from 'vitest'
import { PlanEntitlementService } from '@/entitlements/plan-entitlement-service'

describe('PlanEntitlementService', () => {
  it('defaults every user to the free plan', async () => {
    const service = new PlanEntitlementService()

    const result = await service.for('user-1')

    expect(result).toEqual({
      plan: 'free',
      entitlements: ['whatsappAssistant'],
    })
  })

  it('maps a resolved plan to its entitlements', async () => {
    const service = new PlanEntitlementService(async () => 'premium')

    const result = await service.for('user-2')

    expect(result.plan).toBe('premium')
    expect(result.entitlements).toEqual([
      'calendarSync',
      'whatsappAssistant',
      'premiumModel',
      'proactiveMessaging',
      'smartScheduling',
    ])
  })

  it('resolves the plan per user id', async () => {
    const service = new PlanEntitlementService(async userId =>
      userId === 'paid' ? 'pro' : 'free',
    )

    expect((await service.for('paid')).plan).toBe('pro')
    expect((await service.for('guest')).plan).toBe('free')
  })
})
