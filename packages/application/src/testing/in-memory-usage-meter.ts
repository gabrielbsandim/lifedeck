import type {
  ConsumeResult,
  UsageCounts,
  UsageMeter,
} from '@/ports/usage-meter'

export class InMemoryUsageMeter implements UsageMeter {
  private readonly counts = new Map<string, UsageCounts>()

  async current(userId: string): Promise<UsageCounts> {
    return this.counts.get(userId) ?? { fiveHour: 0, weekly: 0 }
  }

  async add(userId: string, credits: number): Promise<UsageCounts> {
    const current = await this.current(userId)
    const next: UsageCounts = {
      fiveHour: current.fiveHour + credits,
      weekly: current.weekly + credits,
    }
    this.counts.set(userId, next)
    return next
  }

  async consume(
    userId: string,
    credits: number,
    limits: UsageCounts,
  ): Promise<ConsumeResult> {
    const current = await this.current(userId)
    if (current.fiveHour + credits > limits.fiveHour) {
      return { ok: false, window: 'fiveHour', used: current.fiveHour }
    }
    if (current.weekly + credits > limits.weekly) {
      return { ok: false, window: 'weekly', used: current.weekly }
    }
    return { ok: true, counts: await this.add(userId, credits) }
  }
}
