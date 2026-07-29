import type { DispatchWatermark } from '@/ports/dispatch-watermark'

type State = { known: false } | { known: true; nextRunAt: Date | null }

export class FakeDispatchWatermark implements DispatchWatermark {
  drained: Array<Date | null> = []
  noted: Date[] = []
  private state: State = { known: false }

  async noteNextRun(at: Date): Promise<void> {
    this.noted.push(at)
    if (!this.state.known) {
      return
    }
    const current = this.state.nextRunAt
    if (!current || at < current) {
      this.state = { known: true, nextRunAt: at }
    }
  }

  async hasWorkBefore(now: Date): Promise<boolean> {
    if (!this.state.known) {
      return true
    }
    const next = this.state.nextRunAt
    return next !== null && next <= now
  }

  async markDrained(nextRunAt: Date | null): Promise<void> {
    this.drained.push(nextRunAt)
    this.state = { known: true, nextRunAt }
  }
}
