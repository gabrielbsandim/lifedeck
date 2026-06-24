import { describe, expect, it } from 'vitest'
import { Subscription, asEntityId } from '@lifedeck/domain'
import { InMemorySubscriptionRepository } from '@/testing/in-memory-subscription-repository'
import { makeResolvePlanFromSubscription } from '@/use-cases/resolve-plan-from-subscription'

const NOW = new Date('2026-06-24T10:00:00.000Z')
const clock = { now: () => NOW }
const USER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'
const SUB_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

async function repoWith(
  status: 'active' | 'canceled',
  currentPeriodEnd: Date | null,
): Promise<InMemorySubscriptionRepository> {
  const repo = new InMemorySubscriptionRepository()
  await repo.save(
    Subscription.create({
      id: asEntityId(SUB_ID),
      userId: asEntityId(USER_ID),
      plan: 'premium',
      status,
      provider: 'asaas',
      providerRef: 'sub_1',
      currentPeriodEnd,
      now: NOW,
    }),
  )
  return repo
}

describe('resolvePlanFromSubscription', () => {
  it('falls back to free without a subscription', async () => {
    const resolve = makeResolvePlanFromSubscription({
      subscriptions: new InMemorySubscriptionRepository(),
      clock,
    })
    expect(await resolve(USER_ID)).toBe('free')
  })

  it('returns the plan of an active subscription', async () => {
    const resolve = makeResolvePlanFromSubscription({
      subscriptions: await repoWith(
        'active',
        new Date('2026-07-24T10:00:00.000Z'),
      ),
      clock,
    })
    expect(await resolve(USER_ID)).toBe('premium')
  })

  it('falls back to free for an inactive subscription', async () => {
    const resolve = makeResolvePlanFromSubscription({
      subscriptions: await repoWith('canceled', null),
      clock,
    })
    expect(await resolve(USER_ID)).toBe('free')
  })
})
