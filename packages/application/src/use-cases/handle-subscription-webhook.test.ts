import { describe, expect, it, vi } from 'vitest'
import { CheckoutIntent, asEntityId } from '@lifedeck/domain'
import { InMemoryCheckoutIntentRepository } from '@/testing/in-memory-checkout-intent-repository'
import { InMemorySubscriptionRepository } from '@/testing/in-memory-subscription-repository'
import { makeHandleSubscriptionWebhook } from '@/use-cases/handle-subscription-webhook'
import type { PaymentGateway, SubscriptionEvent } from '@/ports/payment-gateway'

const NOW = new Date('2026-06-24T10:00:00.000Z')
const clock = { now: () => NOW }
const USER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'
const NEW_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const INTENT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const ids = { generate: () => asEntityId(NEW_ID) }

function gatewayWith(event: SubscriptionEvent | null): PaymentGateway {
  return {
    provider: 'asaas',
    startCheckout: vi.fn(),
    parseWebhook: vi.fn().mockResolvedValue(event),
    cancelSubscription: vi.fn(),
  }
}

function handlerFor(
  subscriptions: InMemorySubscriptionRepository,
  event: SubscriptionEvent | null,
  checkoutIntents = new InMemoryCheckoutIntentRepository(),
) {
  return makeHandleSubscriptionWebhook({
    gateways: { asaas: gatewayWith(event), stripe: gatewayWith(null) },
    subscriptions,
    checkoutIntents,
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
      reference: null,
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
      reference: null,
    })('asaas', 'raw', 'sig')

    const result = await handlerFor(subscriptions, {
      providerRef: 'sub_1',
      userId: null,
      plan: null,
      status: 'canceled',
      currentPeriodEnd: null,
      reference: null,
    })('asaas', 'raw', 'sig')

    expect(result).toEqual({ handled: true })
    const sub = await subscriptions.findByUser(asEntityId(USER_ID))
    expect(sub?.status).toBe('canceled')
    expect(sub?.plan).toBe('pro')
  })

  it('keeps a known period end when a later active event omits it', async () => {
    const subscriptions = new InMemorySubscriptionRepository()
    const periodEnd = new Date('2026-07-24T10:00:00.000Z')
    // A subscription.* event recorded the real renewal date.
    await handlerFor(subscriptions, {
      providerRef: 'sub_1',
      userId: USER_ID,
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: periodEnd,
      reference: null,
    })('asaas', 'raw', 'sig')

    // A later, out-of-order active event (checkout.session.completed) has no
    // period end and must not wipe the one already stored.
    await handlerFor(subscriptions, {
      providerRef: 'sub_1',
      userId: USER_ID,
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: null,
      reference: null,
    })('asaas', 'raw', 'sig')

    const sub = await subscriptions.findByUser(asEntityId(USER_ID))
    expect(sub?.currentPeriodEnd).toEqual(periodEnd)
  })

  it('clears the period end when the subscription is canceled', async () => {
    const subscriptions = new InMemorySubscriptionRepository()
    await handlerFor(subscriptions, {
      providerRef: 'sub_1',
      userId: USER_ID,
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: new Date('2026-07-24T10:00:00.000Z'),
      reference: null,
    })('asaas', 'raw', 'sig')

    await handlerFor(subscriptions, {
      providerRef: 'sub_1',
      userId: null,
      plan: null,
      status: 'canceled',
      currentPeriodEnd: null,
      reference: null,
    })('asaas', 'raw', 'sig')

    const sub = await subscriptions.findByUser(asEntityId(USER_ID))
    expect(sub?.status).toBe('canceled')
    expect(sub?.currentPeriodEnd).toBeNull()
  })

  it('keeps paid-through access when a scheduled cancel is deleted immediately', async () => {
    const subscriptions = new InMemorySubscriptionRepository()
    const periodEnd = new Date('2026-07-24T10:00:00.000Z')
    // The user scheduled a cancellation: active, but flagged cancelAtPeriodEnd.
    await handlerFor(subscriptions, {
      providerRef: 'sub_1',
      userId: USER_ID,
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: true,
      reference: null,
    })('asaas', 'raw', 'sig')

    // Asaas deletes the subscription right away and reports no period end.
    await handlerFor(subscriptions, {
      providerRef: 'sub_1',
      userId: null,
      plan: null,
      status: 'canceled',
      currentPeriodEnd: null,
      reference: null,
    })('asaas', 'raw', 'sig')

    const sub = await subscriptions.findByUser(asEntityId(USER_ID))
    expect(sub?.status).toBe('canceled')
    // The paid-through date is preserved, so the user keeps access until then.
    expect(sub?.currentPeriodEnd).toEqual(periodEnd)
    expect(sub?.isActive(new Date('2026-07-01T10:00:00.000Z'))).toBe(true)
    expect(sub?.isActive(new Date('2026-07-25T10:00:00.000Z'))).toBe(false)
  })

  it('does not shorten a period end when a stale active event arrives out of order', async () => {
    const subscriptions = new InMemorySubscriptionRepository()
    const later = new Date('2026-08-24T10:00:00.000Z')
    const earlier = new Date('2026-07-24T10:00:00.000Z')
    // The newer event, applied first, records the later renewal date.
    await handlerFor(subscriptions, {
      providerRef: 'sub_1',
      userId: USER_ID,
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: later,
      reference: null,
    })('asaas', 'raw', 'sig')

    // A retried, older active event carries the earlier date and must not win.
    await handlerFor(subscriptions, {
      providerRef: 'sub_1',
      userId: USER_ID,
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: earlier,
      reference: null,
    })('asaas', 'raw', 'sig')

    const sub = await subscriptions.findByUser(asEntityId(USER_ID))
    expect(sub?.currentPeriodEnd).toEqual(later)
  })

  it('keeps a scheduled cancel when a stale reactivation replays the same period', async () => {
    const subscriptions = new InMemorySubscriptionRepository()
    const periodEnd = new Date('2026-07-24T10:00:00.000Z')
    await handlerFor(subscriptions, {
      providerRef: 'sub_1',
      userId: USER_ID,
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      reference: null,
    })('asaas', 'raw', 'sig')

    // The user schedules a cancellation.
    await handlerFor(subscriptions, {
      providerRef: 'sub_1',
      userId: USER_ID,
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: true,
      reference: null,
    })('asaas', 'raw', 'sig')

    // A stale pre-cancel event (same period, cancelAtPeriodEnd false) is retried
    // and must not re-enable billing.
    await handlerFor(subscriptions, {
      providerRef: 'sub_1',
      userId: USER_ID,
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      reference: null,
    })('asaas', 'raw', 'sig')

    const sub = await subscriptions.findByUser(asEntityId(USER_ID))
    expect(sub?.cancelAtPeriodEnd).toBe(true)
  })

  it('clears a scheduled cancel when a genuine renewal extends the period', async () => {
    const subscriptions = new InMemorySubscriptionRepository()
    const periodEnd = new Date('2026-07-24T10:00:00.000Z')
    const renewed = new Date('2026-08-24T10:00:00.000Z')
    await handlerFor(subscriptions, {
      providerRef: 'sub_1',
      userId: USER_ID,
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: true,
      reference: null,
    })('asaas', 'raw', 'sig')

    // A real reactivation carries a strictly later period end.
    await handlerFor(subscriptions, {
      providerRef: 'sub_1',
      userId: USER_ID,
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: renewed,
      cancelAtPeriodEnd: false,
      reference: null,
    })('asaas', 'raw', 'sig')

    const sub = await subscriptions.findByUser(asEntityId(USER_ID))
    expect(sub?.cancelAtPeriodEnd).toBe(false)
    expect(sub?.currentPeriodEnd).toEqual(renewed)
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
      reference: null,
    })
    expect(await handle('asaas', 'raw', 'sig')).toEqual({ handled: false })
    expect(await subscriptions.findByProviderRef('asaas', 'sub_x')).toBeNull()
  })

  it('rejects a referenced event with no matching checkout intent', async () => {
    const subscriptions = new InMemorySubscriptionRepository()
    const handle = handlerFor(subscriptions, {
      providerRef: 'sub_forged',
      userId: USER_ID,
      plan: 'premium',
      status: 'active',
      currentPeriodEnd: null,
      reference: `${USER_ID}|premium|monthly`,
    })

    expect(await handle('asaas', 'raw', 'sig')).toEqual({ handled: false })
    expect(
      await subscriptions.findByProviderRef('asaas', 'sub_forged'),
    ).toBeNull()
  })

  it('creates a referenced subscription when the checkout intent exists', async () => {
    const subscriptions = new InMemorySubscriptionRepository()
    const checkoutIntents = new InMemoryCheckoutIntentRepository()
    await checkoutIntents.save(
      CheckoutIntent.create({
        id: asEntityId(INTENT_ID),
        provider: 'asaas',
        reference: `${USER_ID}|pro|monthly`,
        createdAt: NOW,
      }),
    )
    const handle = handlerFor(
      subscriptions,
      {
        providerRef: 'sub_real',
        userId: USER_ID,
        plan: 'pro',
        status: 'active',
        currentPeriodEnd: null,
        reference: `${USER_ID}|pro|monthly`,
      },
      checkoutIntents,
    )

    expect(await handle('asaas', 'raw', 'sig')).toEqual({ handled: true })
    const sub = await subscriptions.findByUser(asEntityId(USER_ID))
    expect(sub?.plan).toBe('pro')
  })
})
