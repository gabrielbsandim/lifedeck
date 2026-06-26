import type { EntityId, RecurringTask } from '@lifedeck/domain'
import type { Page, PageParams } from '@/pagination'

export interface RecurringTaskRepository {
  save(task: RecurringTask): Promise<void>
  findById(id: EntityId): Promise<RecurringTask | null>
  listByOwner(ownerId: EntityId): Promise<RecurringTask[]>
  pageByOwner(
    ownerId: EntityId,
    params: PageParams,
  ): Promise<Page<RecurringTask>>
  delete(id: EntityId): Promise<void>
}
