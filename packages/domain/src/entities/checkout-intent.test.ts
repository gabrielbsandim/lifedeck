import { describe, expect, it } from 'vitest'
import { ValidationError } from '@/shared/domain-error'
import { asEntityId } from '@/shared/id'
import { CheckoutIntent } from '@/entities/checkout-intent'

const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const NOW = new Date('2026-06-24T10:00:00.000Z')

describe('CheckoutIntent', () => {
  it('creates and exposes its properties', () => {
    const intent = CheckoutIntent.create({
      id: asEntityId(ID),
      provider: 'asaas',
      reference: 'user|pro|monthly',
      createdAt: NOW,
    })

    expect(intent.id).toBe(ID)
    expect(intent.provider).toBe('asaas')
    expect(intent.reference).toBe('user|pro|monthly')
    expect(intent.toJSON()).toEqual({
      id: ID,
      provider: 'asaas',
      reference: 'user|pro|monthly',
      createdAt: NOW,
    })
  })

  it('rejects an empty reference', () => {
    expect(() =>
      CheckoutIntent.create({
        id: asEntityId(ID),
        provider: 'stripe',
        reference: '',
        createdAt: NOW,
      }),
    ).toThrow(ValidationError)
  })

  it('restores from persisted props', () => {
    const intent = CheckoutIntent.restore({
      id: asEntityId(ID),
      provider: 'stripe',
      reference: 'ref',
      createdAt: NOW,
    })
    expect(intent.reference).toBe('ref')
    expect(intent.provider).toBe('stripe')
  })
})
