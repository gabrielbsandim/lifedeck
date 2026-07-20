import type { EntityId, HabitLog } from '@lifedeck/domain'
import type { HabitLogRepository } from '@/ports/habit-log-repository'

export class InMemoryHabitLogRepository implements HabitLogRepository {
  // Keyed by `${habitId}:${date}` to mirror the unique (habit, date) constraint,
  // so logging the same day twice does not create a duplicate mark.
  private readonly store = new Map<string, HabitLog>()

  private key(habitId: string, date: string): string {
    return `${habitId}:${date}`
  }

  async save(log: HabitLog): Promise<void> {
    this.store.set(this.key(log.habitId, log.date), log)
  }

  async findByHabitAndDate(
    habitId: EntityId,
    date: string,
  ): Promise<HabitLog | null> {
    return this.store.get(this.key(habitId, date)) ?? null
  }

  async listByHabitsSince(
    habitIds: EntityId[],
    since: string,
  ): Promise<HabitLog[]> {
    const ids = new Set<string>(habitIds)
    return [...this.store.values()].filter(
      log => ids.has(log.habitId) && log.date >= since,
    )
  }

  async deleteByHabitAndDate(habitId: EntityId, date: string): Promise<void> {
    this.store.delete(this.key(habitId, date))
  }
}
