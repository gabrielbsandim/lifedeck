import { describe, expect, it, vi } from 'vitest'
import { asEntityId } from '@lifedeck/domain'
import { InMemorySubscriptionRepository } from '@/testing/in-memory-subscription-repository'
import { makeHandleSubscriptionWebhook } from '@/use-cases/handle-subscription-webhook'
import type { PaymentGateway, SubscriptionEvent } from '@/ports/payment-gateway'

const NOW = new Date('2026-06-24T10:00:00.000Z')
const clock = { now: () => NOW }
const USER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'
const NEW_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const ids = { generate: () => asEntityId(NEW_ID) }

function gatewayWith(event: SubscriptionEvent | null): PaymentGateway {
  return {
    provider: 'asaas',
    startCheckout: vi.fn(),
    parseWebhook: vi.fn().mockResolvedValue(event),
  }
}

function handlerFor(
  subscriptions: InMemorySubscriptionRepository,
  event: SubscriptionEvent | null,
) {
  return makeHandleSubscriptionWebhook({
    gateways: { asaas: gatewayWith(event), stripe: gatewayWith(null) },
    subscriptions,
    ids,
    clock,
  })
}

describe('handleSubscriptionWebhook', () => {
  it('creates a subscription from a new event', async () => {
    const subscriptions = new InMemorySubscriptionRepository()
    const handle = handlerFor(subscriptions, {
      providerRef: 'sub_1',
      userId: USER_ID,
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: new Date('2026-07-24T10:00:00.000Z'),
    })

    const result = await handle('asaas', 'raw', 'sig')

    expect(result).toEqual({ handled: true })
    const sub = await subscriptions.findByUser(asEntityId(USER_ID))
    expect(sub?.plan).toBe('pro')
    expect(sub?.status).toBe('active')
  })

  it('updates an existing subscription by provider ref', async () => {
    const subscriptions = new InMemorySubscriptionRepository()
    await handlerFor(subscriptions, {
      providerRef: 'sub_1',
      userId: USER_ID,
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: null,
    })('asaas', 'raw', 'sig')

    const result = await handlerFor(subscriptions, {
      providerRef: 'sub_1',
      userId: null,
      plan: null,
      status: 'canceled',
      currentPeriodEnd: null,
    })('asaas', 'raw', 'sig')

    expect(result).toEqual({ handled: true })
    const sub = await subscriptions.findByUser(asEntityId(USER_ID))
    expect(sub?.status).toBe('canceled')
    expect(sub?.plan).toBe('pro')
  })

  it('ignores an event the gateway cannot parse', async () => {
    const subscriptions = new InMemorySubscriptionRepository()
    const handle = handlerFor(subscriptions, null)
    expect(await handle('asaas', 'raw', null)).toEqual({ handled: false })
  })

  it('does not create a subscription without a user and plan', async () => {
    const subscriptions = new InMemorySubscriptionRepository()
    const handle = handlerFor(subscriptions, {
      providerRef: 'sub_x',
      userId: null,
      plan: null,
      status: 'active',
      currentPeriodEnd: null,
    })
    expect(await handle('asaas', 'raw', 'sig')).toEqual({ handled: false })
    expect(await subscriptions.findByProviderRef('asaas', 'sub_x')).toBeNull()
  })
})
