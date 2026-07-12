import { describe, expect, it, vi } from 'vitest'
import {
  Subscription,
  asEntityId,
  type PaymentProvider,
} from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemorySubscriptionRepository } from '@/testing/in-memory-subscription-repository'
import { makeCancelSubscription } from '@/use-cases/cancel-subscription'
import type { PaymentGateway } from '@/ports/payment-gateway'

const NOW = new Date('2026-06-24T10:00:00.000Z')
const USER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'

function gateway(): PaymentGateway {
  return {
    provider: 'asaas',
    startCheckout: vi.fn(),
    parseWebhook: vi.fn(),
    cancelSubscription: vi.fn().mockResolvedValue(undefined),
  }
}

function activeSubscription() {
  return Subscription.create({
    id: asEntityId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    userId: asEntityId(USER_ID),
    plan: 'pro',
    status: 'active',
    provider: 'asaas',
    providerRef: 'sub_123',
    currentPeriodEnd: new Date('2026-07-24T10:00:00.000Z'),
    now: NOW,
  })
}

function setup() {
  const subscriptions = new InMemorySubscriptionRepository()
  const asaas = gateway()
  const stripe = gateway()
  const gateways = { asaas, stripe } as Record<PaymentProvider, PaymentGateway>
  const cancel = makeCancelSubscription({
    gateways,
    subscriptions,
    clock: { now: () => NOW },
  })
  return { subscriptions, asaas, stripe, cancel }
}

describe('cancelSubscription', () => {
  it('cancels the active subscription at the provider and marks it locally', async () => {
    const { subscriptions, asaas, cancel } = setup()
    await subscriptions.save(activeSubscription())

    const result = await cancel(USER_ID)

    expect(result).toEqual({ cancelAtPeriodEnd: true })
    expect(asaas.cancelSubscription).toHaveBeenCalledWith('sub_123')
    const stored = await subscriptions.findByUser(asEntityId(USER_ID))
    expect(stored?.cancelAtPeriodEnd).toBe(true)
  })

  it('cancels a past_due subscription so dunning stops', async () => {
    const { subscriptions, asaas, cancel } = setup()
    const pastDue = Subscription.create({
      id: asEntityId('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
      userId: asEntityId(USER_ID),
      plan: 'pro',
      status: 'past_due',
      provider: 'asaas',
      providerRef: 'sub_pd',
      currentPeriodEnd: new Date('2026-06-20T10:00:00.000Z'),
      now: NOW,
    })
    await subscriptions.save(pastDue)

    await expect(cancel(USER_ID)).resolves.toEqual({ cancelAtPeriodEnd: true })
    expect(asaas.cancelSubscription).toHaveBeenCalledWith('sub_pd')
  })

  it('cancels every live subscription so an upgrade stops billing too', async () => {
    const { subscriptions, asaas, stripe, cancel } = setup()
    await subscriptions.save(activeSubscription())
    await subscriptions.save(
      Subscription.create({
        id: asEntityId('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'),
        userId: asEntityId(USER_ID),
        plan: 'premium',
        status: 'active',
        provider: 'stripe',
        providerRef: 'sub_stripe',
        currentPeriodEnd: new Date('2026-07-24T10:00:00.000Z'),
        now: new Date('2026-06-25T10:00:00.000Z'),
      }),
    )

    await expect(cancel(USER_ID)).resolves.toEqual({ cancelAtPeriodEnd: true })
    expect(asaas.cancelSubscription).toHaveBeenCalledWith('sub_123')
    expect(stripe.cancelSubscription).toHaveBeenCalledWith('sub_stripe')
    const stored = await subscriptions.listByUser(asEntityId(USER_ID))
    expect(stored.every(s => s.cancelAtPeriodEnd)).toBe(true)
  })

  it('throws when there is no active subscription', async () => {
    const { cancel } = setup()
    await expect(cancel(USER_ID)).rejects.toBeInstanceOf(NotFoundError)
  })

  it('throws when the only subscription is already canceled', async () => {
    const { subscriptions, cancel } = setup()
    const canceled = Subscription.create({
      id: asEntityId('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
      userId: asEntityId(USER_ID),
      plan: 'pro',
      status: 'canceled',
      provider: 'asaas',
      providerRef: 'sub_dead',
      currentPeriodEnd: null,
      now: NOW,
    })
    await subscriptions.save(canceled)
    await expect(cancel(USER_ID)).rejects.toBeInstanceOf(NotFoundError)
  })
})
