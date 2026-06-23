import type { EntityId, RecurringTask } from '@lifedeck/domain'

export interface RecurringTaskRepository {
  save(task: RecurringTask): Promise<void>
  findById(id: EntityId): Promise<RecurringTask | null>
  listByOwner(ownerId: EntityId): Promise<RecurringTask[]>
  delete(id: EntityId): Promise<void>
}
