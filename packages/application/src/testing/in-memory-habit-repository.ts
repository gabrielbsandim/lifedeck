import type { EntityId, Habit } from '@lifedeck/domain'
import type { HabitRepository } from '@/ports/habit-repository'

export class InMemoryHabitRepository implements HabitRepository {
  private readonly store = new Map<string, Habit>()

  async save(habit: Habit): Promise<void> {
    this.store.set(habit.id, habit)
  }

  async findById(id: EntityId): Promise<Habit | null> {
    return this.store.get(id) ?? null
  }

  async listByOwner(ownerId: EntityId): Promise<Habit[]> {
    return [...this.store.values()]
      .filter(habit => habit.ownerId === ownerId)
      .sort((a, b) => {
        const byDate =
          a.toJSON().createdAt.getTime() - b.toJSON().createdAt.getTime()
        return byDate !== 0 ? byDate : a.id.localeCompare(b.id)
      })
  }

  async countByOwner(ownerId: EntityId): Promise<number> {
    return (await this.listByOwner(ownerId)).length
  }

  async listActiveWithCheckin(): Promise<Habit[]> {
    return [...this.store.values()].filter(
      habit => habit.active && habit.checkinHour !== null,
    )
  }

  async delete(id: EntityId): Promise<void> {
    this.store.delete(id)
  }
}
