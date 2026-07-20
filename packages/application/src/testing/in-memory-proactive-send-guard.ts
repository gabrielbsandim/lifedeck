import type { ProactiveSendGuard } from '@/ports/proactive-send-guard'

// Per-process fake of the daily proactive cap for tests and single-instance dev.
export class InMemoryProactiveSendGuard implements ProactiveSendGuard {
  private readonly counts = new Map<string, number>()

  constructor(private readonly cap: number) {}

  async tryConsume(userId: string, civilDate: string): Promise<boolean> {
    const key = `${userId}:${civilDate}`
    const next = (this.counts.get(key) ?? 0) + 1
    this.counts.set(key, next)
    return next <= this.cap
  }
}
