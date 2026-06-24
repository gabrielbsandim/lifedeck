import { quotaForPlan, type Plan } from '@lifedeck/domain'
import type { UsageMeter } from '@/ports/usage-meter'
import type { UsageSummary } from '@/use-cases/consume-credits'

type Dependencies = {
  usageMeter: UsageMeter
  resolvePlan: (userId: string) => Promise<Plan>
}

export function makeGetUsage({ usageMeter, resolvePlan }: Dependencies) {
  return async function getUsage(userId: string): Promise<UsageSummary> {
    const plan = await resolvePlan(userId)
    const quota = quotaForPlan(plan)
    const current = await usageMeter.current(userId)
    return {
      plan,
      fiveHour: { used: current.fiveHour, limit: quota.fiveHourCredits },
      weekly: { used: current.weekly, limit: quota.weeklyCredits },
    }
  }
}
