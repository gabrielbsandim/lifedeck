import { describe, expect, it } from 'vitest'
import { InMemoryUsageMeter } from '@/testing/in-memory-usage-meter'
import { makeGetUsage } from '@/use-cases/get-usage'

const USER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'

describe('getUsage', () => {
  it('reports current usage against the plan quota', async () => {
    const usageMeter = new InMemoryUsageMeter()
    await usageMeter.add(USER_ID, 3)
    const getUsage = makeGetUsage({
      usageMeter,
      resolvePlan: async () => 'pro',
    })
    const summary = await getUsage(USER_ID)
    expect(summary.plan).toBe('pro')
    expect(summary.fiveHour).toEqual({ used: 3, limit: 40 })
    expect(summary.weekly).toEqual({ used: 3, limit: 200 })
  })

  it('reports zero usage for an untouched user', async () => {
    const getUsage = makeGetUsage({
      usageMeter: new InMemoryUsageMeter(),
      resolvePlan: async () => 'free',
    })
    const summary = await getUsage(USER_ID)
    expect(summary.fiveHour.used).toBe(0)
    expect(summary.weekly.used).toBe(0)
  })
})
