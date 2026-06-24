import type { UsageEvent } from '@lifedeck/domain'
import type { UsageEventLedger } from '@/ports/usage-event-ledger'

export class InMemoryUsageEventLedger implements UsageEventLedger {
  readonly events: UsageEvent[] = []

  async record(event: UsageEvent): Promise<void> {
    this.events.push(event)
  }
}
