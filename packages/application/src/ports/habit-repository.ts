import type { EntityId, Habit } from '@lifedeck/domain'

export interface HabitRepository {
  save(habit: Habit): Promise<void>
  findById(id: EntityId): Promise<Habit | null>
  listByOwner(ownerId: EntityId): Promise<Habit[]>
  // How many habits the owner already has, so the free-plan single-habit cap can
  // be enforced without loading them all.
  countByOwner(ownerId: EntityId): Promise<number>
  // Active habits with a check-in hour set: the small candidate set the hourly
  // check-in sweep scans (their owner's local hour is matched at send time).
  listActiveWithCheckin(): Promise<Habit[]>
  delete(id: EntityId): Promise<void>
}
