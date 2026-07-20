import type { EntityId } from '@lifedeck/domain'
import type {
  NudgeLogEntry,
  NudgeLogRepository,
} from '@/ports/nudge-log-repository'

export class InMemoryNudgeLogRepository implements NudgeLogRepository {
  private readonly entries: NudgeLogEntry[] = []

  async hasSentOn(userId: EntityId, date: string): Promise<boolean> {
    return this.entries.some(
      entry => entry.userId === userId && entry.date === date,
    )
  }

  async lastSentDate(userId: EntityId, key: string): Promise<string | null> {
    const dates = this.entries
      .filter(entry => entry.userId === userId && entry.key === key)
      .map(entry => entry.date)
      .sort()
    return dates.at(-1) ?? null
  }

  async record(entry: NudgeLogEntry): Promise<void> {
    this.entries.push({ ...entry })
  }
}
