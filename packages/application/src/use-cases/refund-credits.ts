import { creditCostOf, type AiOperation } from '@lifedeck/domain'
import type { UsageMeter } from '@/ports/usage-meter'

type Dependencies = {
  usageMeter: UsageMeter
}

export function makeRefundCredits({ usageMeter }: Dependencies) {
  // Reverses a metered charge when the work it paid for failed at runtime (the
  // model errored after the credit was already consumed). It offsets the usage
  // meter, which is what gates quota, with a negative entry so the user is not
  // charged for a result they never received. The ledger keeps the original
  // event as an audit trail; the meter is the source of truth for entitlement.
  return async function refundCredits(
    userId: string,
    operation: AiOperation,
  ): Promise<void> {
    await usageMeter.add(userId, -creditCostOf(operation))
  }
}
