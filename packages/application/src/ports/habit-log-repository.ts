import type { EntityId, HabitLog } from '@lifedeck/domain'

export interface HabitLogRepository {
  // Idempotent per (habit, date): logging a day already logged is a no-op.
  save(log: HabitLog): Promise<void>
  findByHabitAndDate(habitId: EntityId, date: string): Promise<HabitLog | null>
  // Completion marks for the given habits on or after a civil date, so a streak
  // reads a bounded window in one query instead of the whole history.
  listByHabitsSince(habitIds: EntityId[], since: string): Promise<HabitLog[]>
  deleteByHabitAndDate(habitId: EntityId, date: string): Promise<void>
}
