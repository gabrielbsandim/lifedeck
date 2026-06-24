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
    const current = await usageMeter.current(userId)

    if (current.fiveHour + cost > quota.fiveHourCredits) {
      throw new QuotaExceededError(
        'fiveHour',
        quota.fiveHourCredits,
        current.fiveHour,
      )
    }
    if (current.weekly + cost > quota.weeklyCredits) {
      throw new QuotaExceededError(
        'weekly',
        quota.weeklyCredits,
        current.weekly,
      )
    }

    const updated = await usageMeter.add(userId, cost)
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
