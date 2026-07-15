import { describe, expect, it } from 'vitest'
import { asEntityId, type Plan } from '@lifedeck/domain'
import { QuotaExceededError } from '@/errors/use-case-error'
import { InMemoryUsageMeter } from '@/testing/in-memory-usage-meter'
import { InMemoryUsageEventLedger } from '@/testing/in-memory-usage-event-ledger'
import { makeConsumeCredits } from '@/use-cases/consume-credits'

const NOW = new Date('2026-06-24T10:00:00.000Z')
const USER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'
const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

function setup(plan: Plan) {
  const usageMeter = new InMemoryUsageMeter()
  const ledger = new InMemoryUsageEventLedger()
  const consume = makeConsumeCredits({
    usageMeter,
    ledger,
    resolvePlan: async () => plan,
    ids: { generate: () => asEntityId(ID) },
    clock: { now: () => NOW },
  })
  return { usageMeter, ledger, consume }
}

describe('consumeCredits', () => {
  it('debits the operation cost and records a ledger event', async () => {
    const { ledger, consume } = setup('free')
    const summary = await consume(USER_ID, 'listGeneration')
    expect(summary.fiveHour).toEqual({ used: 1, limit: 15 })
    expect(summary.weekly).toEqual({ used: 1, limit: 50 })
    expect(ledger.events).toHaveLength(1)
    expect(ledger.events[0]?.operation).toBe('listGeneration')
    expect(ledger.events[0]?.credits).toBe(1)
  })

  it('weights premium-model operations by their credit cost', async () => {
    const { consume } = setup('premium')
    const summary = await consume(USER_ID, 'assistantPro')
    expect(summary.fiveHour.used).toBe(6)
  })

  it('rejects when the five-hour window would be exceeded', async () => {
    const { usageMeter, ledger, consume } = setup('free')
    await usageMeter.add(USER_ID, 15)
    await expect(consume(USER_ID, 'listGeneration')).rejects.toBeInstanceOf(
      QuotaExceededError,
    )
    expect(ledger.events).toHaveLength(0)
  })

  it('reports the offending window on the error', async () => {
    const { usageMeter, consume } = setup('free')
    await usageMeter.add(USER_ID, 15)
    await expect(consume(USER_ID, 'listGeneration')).rejects.toMatchObject({
      window: 'fiveHour',
      limit: 15,
      used: 15,
    })
  })

  it('reports the weekly window when only it overflows on the meter', async () => {
    const usageMeter = new InMemoryUsageMeter()
    const result = await usageMeter.consume(USER_ID, 1, {
      fiveHour: 10,
      weekly: 0,
    })
    expect(result).toEqual({ ok: false, window: 'weekly', used: 0 })
  })

  it('rejects when only the weekly window is exhausted', async () => {
    const ledger = new InMemoryUsageEventLedger()
    const consume = makeConsumeCredits({
      usageMeter: {
        current: async () => ({ fiveHour: 0, weekly: 200 }),
        add: async () => ({ fiveHour: 1, weekly: 201 }),
        consume: async () => ({
          ok: false as const,
          window: 'weekly' as const,
          used: 200,
        }),
      },
      ledger,
      resolvePlan: async () => 'pro',
      ids: { generate: () => asEntityId(ID) },
      clock: { now: () => NOW },
    })
    await expect(consume(USER_ID, 'listGeneration')).rejects.toMatchObject({
      window: 'weekly',
      limit: 200,
    })
    expect(ledger.events).toHaveLength(0)
  })
})
