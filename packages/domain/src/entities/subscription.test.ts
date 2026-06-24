import { describe, expect, it } from 'vitest'
import { ValidationError } from '@/shared/domain-error'
import { asEntityId } from '@/shared/id'
import { Subscription } from '@/entities/subscription'

const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const USER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'
const NOW = new Date('2026-06-24T10:00:00.000Z')

function build(
  overrides: Partial<{
    status: 'trialing' | 'active' | 'past_due' | 'canceled'
    currentPeriodEnd: Date | null
  }> = {},
): Subscription {
  return Subscription.create({
    id: asEntityId(ID),
    userId: asEntityId(USER_ID),
    plan: 'pro',
    status: overrides.status ?? 'active',
    provider: 'asaas',
    providerRef: 'sub_123',
    currentPeriodEnd:
      overrides.currentPeriodEnd ?? new Date('2026-07-24T10:00:00.000Z'),
    now: NOW,
  })
}

describe('Subscription', () => {
  it('creates with matching created and updated timestamps', () => {
    const props = build().toJSON()
    expect(props.createdAt).toEqual(NOW)
    expect(props.updatedAt).toEqual(NOW)
    expect(props.providerRef).toBe('sub_123')
  })

  it('exposes its identity and provider', () => {
    const sub = build()
    expect(sub.id).toBe(ID)
    expect(sub.userId).toBe(USER_ID)
    expect(sub.provider).toBe('asaas')
    expect(sub.providerRef).toBe('sub_123')
  })

  it('rejects an empty provider reference', () => {
    expect(() =>
      Subscription.create({
        id: asEntityId(ID),
        userId: asEntityId(USER_ID),
        plan: 'pro',
        status: 'active',
        provider: 'stripe',
        providerRef: '  ',
        currentPeriodEnd: null,
        now: NOW,
      }),
    ).toThrow(ValidationError)
  })

  it('updates status, period, plan, and the updated timestamp', () => {
    const sub = build()
    const later = new Date('2026-06-25T10:00:00.000Z')
    const periodEnd = new Date('2026-08-24T10:00:00.000Z')
    sub.update(
      { plan: 'premium', status: 'past_due', currentPeriodEnd: periodEnd },
      later,
    )
    const props = sub.toJSON()
    expect(props.plan).toBe('premium')
    expect(props.status).toBe('past_due')
    expect(props.currentPeriodEnd).toEqual(periodEnd)
    expect(props.updatedAt).toEqual(later)
  })

  it('keeps the plan when an update omits it', () => {
    const sub = build()
    sub.update({ status: 'active', currentPeriodEnd: null }, NOW)
    expect(sub.plan).toBe('pro')
  })

  it('is active when active within the current period', () => {
    expect(build({ status: 'active' }).isActive(NOW)).toBe(true)
  })

  it('is active when active with no period end', () => {
    expect(
      build({ status: 'active', currentPeriodEnd: null }).isActive(NOW),
    ).toBe(true)
  })

  it('is active while trialing', () => {
    expect(build({ status: 'trialing' }).isActive(NOW)).toBe(true)
  })

  it('is inactive once the period has ended', () => {
    const expired = build({
      status: 'active',
      currentPeriodEnd: new Date('2026-06-23T10:00:00.000Z'),
    })
    expect(expired.isActive(NOW)).toBe(false)
  })

  it('is inactive when canceled', () => {
    expect(build({ status: 'canceled' }).isActive(NOW)).toBe(false)
  })

  it('restores from persisted props', () => {
    const sub = build()
    expect(Subscription.restore(sub.toJSON()).toJSON()).toEqual(sub.toJSON())
  })
})
