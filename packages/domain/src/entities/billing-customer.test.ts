import { describe, expect, it } from 'vitest'
import { BillingCustomer } from '@/entities/billing-customer'
import { asEntityId } from '@/shared/id'

const base = {
  id: asEntityId('11111111-1111-4111-8111-111111111111'),
  userId: asEntityId('22222222-2222-4222-8222-222222222222'),
  provider: 'asaas' as const,
  customerId: 'cus_123',
  createdAt: new Date('2026-06-24T10:00:00.000Z'),
}

describe('BillingCustomer', () => {
  it('creates a customer and exposes its fields', () => {
    const customer = BillingCustomer.create(base)
    expect(customer.id).toBe(base.id)
    expect(customer.userId).toBe(base.userId)
    expect(customer.provider).toBe('asaas')
    expect(customer.customerId).toBe('cus_123')
    expect(customer.toJSON()).toEqual(base)
  })

  it('rejects an empty customer id', () => {
    expect(() => BillingCustomer.create({ ...base, customerId: '  ' })).toThrow(
      /Billing customer id/,
    )
  })

  it('restores from persisted props', () => {
    const restored = BillingCustomer.restore(base)
    expect(restored.customerId).toBe('cus_123')
    expect(restored.toJSON()).toEqual(base)
  })
})
