import { describe, expect, it } from 'vitest'
import { Subscription, asEntityId } from '@lifedeck/domain'
import { InMemorySubscriptionRepository } from '@/testing/in-memory-subscription-repository'
import { makeGetSubscription } from '@/use-cases/get-subscription'

const NOW = new Date('2026-06-24T10:00:00.000Z')
const USER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'

describe('getSubscription', () => {
  it('returns null when the user has no subscription', async () => {
    const getSubscription = makeGetSubscription({
      subscriptions: new InMemorySubscriptionRepository(),
    })
    expect(await getSubscription(USER_ID)).toBeNull()
  })

  it('returns a subscription view', async () => {
    const subscriptions = new InMemorySubscriptionRepository()
    await subscriptions.save(
      Subscription.create({
        id: asEntityId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
        userId: asEntityId(USER_ID),
        plan: 'premium',
        status: 'active',
        provider: 'stripe',
        providerRef: 'sub_1',
        currentPeriodEnd: new Date('2026-07-24T10:00:00.000Z'),
        now: NOW,
      }),
    )
    const getSubscription = makeGetSubscription({ subscriptions })

    expect(await getSubscription(USER_ID)).toEqual({
      plan: 'premium',
      status: 'active',
      provider: 'stripe',
      currentPeriodEnd: '2026-07-24T10:00:00.000Z',
      cancelAtPeriodEnd: false,
    })
  })

  it('prefers a live subscription over a newer canceled one', async () => {
    const subscriptions = new InMemorySubscriptionRepository()
    await subscriptions.save(
      Subscription.create({
        id: asEntityId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
        userId: asEntityId(USER_ID),
        plan: 'pro',
        status: 'active',
        provider: 'stripe',
        providerRef: 'sub_live',
        currentPeriodEnd: new Date('2026-07-24T10:00:00.000Z'),
        now: NOW,
      }),
    )
    await subscriptions.save(
      Subscription.create({
        id: asEntityId('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
        userId: asEntityId(USER_ID),
        plan: 'premium',
        status: 'canceled',
        provider: 'stripe',
        providerRef: 'sub_dead',
        currentPeriodEnd: null,
        now: new Date('2026-06-25T10:00:00.000Z'),
      }),
    )
    const getSubscription = makeGetSubscription({ subscriptions })

    const view = await getSubscription(USER_ID)
    expect(view?.plan).toBe('pro')
    expect(view?.status).toBe('active')
  })

  it('falls back to the most recent when all are canceled', async () => {
    const subscriptions = new InMemorySubscriptionRepository()
    await subscriptions.save(
      Subscription.create({
        id: asEntityId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
        userId: asEntityId(USER_ID),
        plan: 'pro',
        status: 'canceled',
        provider: 'stripe',
        providerRef: 'sub_old',
        currentPeriodEnd: null,
        now: NOW,
      }),
    )
    const getSubscription = makeGetSubscription({ subscriptions })

    expect((await getSubscription(USER_ID))?.status).toBe('canceled')
  })
})
