import { describe, expect, it } from 'vitest'
import { asEntityId, type Plan } from '@lifedeck/domain'
import { InMemoryFeatureTrialRepository } from '@/testing/in-memory-feature-trial-repository'
import {
  BOOKING_TRIAL_DAYS,
  makeGetBookingTrial,
  makeStartBookingTrial,
} from '@/use-cases/booking-trial'

const USER = '11111111-1111-4111-8111-111111111111'
const NOW = new Date('2026-06-21T12:00:00.000Z')

function setup(plan: Plan = 'free') {
  let now = NOW
  const trials = new InMemoryFeatureTrialRepository()
  const deps = {
    trials,
    entitlements: { for: async () => ({ plan, entitlements: [] }) },
    clock: { now: () => now },
  }
  return {
    trials,
    get: makeGetBookingTrial(deps),
    start: makeStartBookingTrial(deps),
    setNow: (value: Date) => {
      now = value
    },
  }
}

describe('booking trial', () => {
  it('offers a trial to a free user and starts it once', async () => {
    const ctx = setup()
    expect(await ctx.get(USER)).toEqual({
      available: true,
      active: false,
      endsAt: null,
    })

    const started = await ctx.start(USER)
    const endsAt = new Date(
      NOW.getTime() + BOOKING_TRIAL_DAYS * 86_400_000,
    ).toISOString()
    expect(started).toEqual({ available: false, active: true, endsAt })

    expect(await ctx.start(USER)).toEqual(started)
    expect(await ctx.trials.listByUser(asEntityId(USER))).toHaveLength(1)
  })

  it('reports an ended trial and never restarts it', async () => {
    const ctx = setup()
    await ctx.start(USER)
    ctx.setNow(new Date('2026-07-10T00:00:00.000Z'))
    const ended = await ctx.start(USER)
    expect(ended).toMatchObject({ available: false, active: false })
  })

  it('has nothing to offer a plan that already includes booking', async () => {
    const ctx = setup('pro')
    expect(await ctx.start(USER)).toEqual({
      available: false,
      active: false,
      endsAt: null,
    })
    expect(await ctx.trials.listByUser(asEntityId(USER))).toEqual([])
  })
})
