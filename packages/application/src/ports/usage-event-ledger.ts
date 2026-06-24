import type { UsageEvent } from '@lifedeck/domain'

export interface UsageEventLedger {
  record(event: UsageEvent): Promise<void>
}
