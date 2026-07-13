import { describe, expect, it } from 'vitest'
import { creditCostOf } from '@lifedeck/domain'
import { InMemoryUsageMeter } from '@/testing/in-memory-usage-meter'
import { makeRefundCredits } from '@/use-cases/refund-credits'

const USER = 'user-1'

describe('refundCredits', () => {
  it('offsets the meter by the operation cost so a failed charge is reversed', async () => {
    const meter = new InMemoryUsageMeter()
    await meter.add(USER, creditCostOf('assistantPro'))

    await makeRefundCredits({ usageMeter: meter })(USER, 'assistantPro')

    expect(await meter.current(USER)).toEqual({ fiveHour: 0, weekly: 0 })
  })

  it('frees the quota back up for the next request', async () => {
    const meter = new InMemoryUsageMeter()
    await meter.add(USER, creditCostOf('audioTranscription'))
    expect((await meter.current(USER)).weekly).toBe(2)

    await makeRefundCredits({ usageMeter: meter })(USER, 'audioTranscription')

    expect((await meter.current(USER)).weekly).toBe(0)
  })
})
