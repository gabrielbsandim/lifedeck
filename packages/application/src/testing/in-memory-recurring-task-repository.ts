import type { EntityId, RecurringTask } from '@lifedeck/domain'
import { type Page, type PageParams, paginateByCreatedAt } from '@/pagination'
import type { RecurringTaskRepository } from '@/ports/recurring-task-repository'

export class InMemoryRecurringTaskRepository
  implements RecurringTaskRepository
{
  private readonly store = new Map<string, RecurringTask>()

  async save(task: RecurringTask): Promise<void> {
    this.store.set(task.id, task)
  }

  async findById(id: EntityId): Promise<RecurringTask | null> {
    return this.store.get(id) ?? null
  }

  async listByOwner(ownerId: EntityId): Promise<RecurringTask[]> {
    return [...this.store.values()].filter(task => task.ownerId === ownerId)
  }

  async pageByOwner(
    ownerId: EntityId,
    params: PageParams,
  ): Promise<Page<RecurringTask>> {
    const owned = [...this.store.values()].filter(
      task => task.ownerId === ownerId,
    )
    return paginateByCreatedAt(owned, params, task => ({
      createdAt: task.toJSON().createdAt,
      id: task.id,
    }))
  }

  async delete(id: EntityId): Promise<void> {
    this.store.delete(id)
  }
}
