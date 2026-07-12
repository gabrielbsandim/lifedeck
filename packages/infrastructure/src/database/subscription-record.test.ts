import { describe, expect, it } from 'vitest'
import { Subscription, asEntityId } from '@lifedeck/domain'
import {
  toDomainSubscription,
  toSubscriptionRecord,
  type SubscriptionRecord,
} from '@/database/subscription-record'

const RECORD: SubscriptionRecord = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  userId: 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb',
  plan: 'pro',
  status: 'active',
  provider: 'asaas',
  providerRef: 'sub_123',
  currentPeriodEnd: new Date('2026-07-24T10:00:00.000Z'),
  cancelAtPeriodEnd: false,
  createdAt: new Date('2026-06-24T10:00:00.000Z'),
  updatedAt: new Date('2026-06-24T10:00:00.000Z'),
}

describe('subscription-record', () => {
  it('maps a record to a domain subscription', () => {
    const subscription = toDomainSubscription(RECORD)
    expect(subscription.plan).toBe('pro')
    expect(subscription.status).toBe('active')
    expect(subscription.provider).toBe('asaas')
    expect(subscription.providerRef).toBe('sub_123')
  })

  it('maps a domain subscription back to a record', () => {
    const subscription = Subscription.restore({
      id: asEntityId(RECORD.id),
      userId: asEntityId(RECORD.userId),
      plan: 'premium',
      status: 'canceled',
      provider: RECORD.provider,
      providerRef: RECORD.providerRef,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      createdAt: RECORD.createdAt,
      updatedAt: RECORD.updatedAt,
    })
    expect(toSubscriptionRecord(subscription)).toEqual({
      ...RECORD,
      plan: 'premium',
      status: 'canceled',
      currentPeriodEnd: null,
    })
  })
})
