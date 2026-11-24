import { describe, expect, it, vi } from 'vitest'
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
      'booking',
    ])
  })

  it('resolves the plan per user id', async () => {
    const service = new PlanEntitlementService(async userId =>
      userId === 'paid' ? 'pro' : 'free',
    )

    expect((await service.for('paid')).plan).toBe('pro')
    expect((await service.for('guest')).plan).toBe('free')
  })

  it('adds an entitlement on a running trial, and only then', async () => {
    const endsAt = new Date('2026-07-05T12:00:00.000Z')
    const repository = {
      listByUser: vi.fn(async () => [
        {
          entitlement: 'booking' as const,
          startedAt: new Date('2026-06-21T12:00:00.000Z'),
          endsAt,
        },
      ]),
    }
    let now = new Date('2026-06-22T00:00:00.000Z')
    const clock = { now: () => now }
    const free = new PlanEntitlementService(async () => 'free', {
      repository,
      clock,
    })

    expect((await free.for('u')).entitlements).toEqual([
      'whatsappAssistant',
      'booking',
    ])
    now = endsAt
    expect((await free.for('u')).entitlements).toEqual(['whatsappAssistant'])

    repository.listByUser.mockClear()
    const pro = new PlanEntitlementService(async () => 'pro', {
      repository,
      clock,
    })
    expect((await pro.for('u')).entitlements).toContain('booking')
    expect(repository.listByUser).not.toHaveBeenCalled()
  })
})
