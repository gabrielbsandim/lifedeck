import {
  UsageEvent,
  asEntityId,
  creditCostOf,
  quotaForPlan,
  type AiOperation,
  type Plan,
} from '@lifedeck/domain'
import { QuotaExceededError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { UsageEventLedger } from '@/ports/usage-event-ledger'
import type { UsageMeter } from '@/ports/usage-meter'

export type UsageSummary = {
  plan: Plan
  fiveHour: { used: number; limit: number }
  weekly: { used: number; limit: number }
}

type Dependencies = {
  usageMeter: UsageMeter
  ledger: UsageEventLedger
  resolvePlan: (userId: string) => Promise<Plan>
  ids: IdGenerator
  clock: Clock
}

export function makeConsumeCredits({
  usageMeter,
  ledger,
  resolvePlan,
  ids,
  clock,
}: Dependencies) {
  return async function consumeCredits(
    userId: string,
    operation: AiOperation,
  ): Promise<UsageSummary> {
    const cost = creditCostOf(operation)
    const plan = await resolvePlan(userId)
    const quota = quotaForPlan(plan)

    const result = await usageMeter.consume(userId, cost, {
      fiveHour: quota.fiveHourCredits,
      weekly: quota.weeklyCredits,
    })

    if (!result.ok) {
      const limit =
        result.window === 'fiveHour'
          ? quota.fiveHourCredits
          : quota.weeklyCredits
      throw new QuotaExceededError(result.window, limit, result.used)
    }

    const updated = result.counts
    await ledger.record(
      UsageEvent.create({
        id: ids.generate(),
        userId: asEntityId(userId),
        operation,
        credits: cost,
        now: clock.now(),
      }),
    )

    return {
      plan,
      fiveHour: { used: updated.fiveHour, limit: quota.fiveHourCredits },
      weekly: { used: updated.weekly, limit: quota.weeklyCredits },
    }
  }
}
