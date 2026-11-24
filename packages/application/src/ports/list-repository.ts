import type { EntityId, List, ListType } from '@lifedeck/domain'
import type { Page, PageParams } from '@/pagination'

export type ListPageParams = PageParams & {
  type: ListType | null
}

export interface ListRepository {
  save(list: List): Promise<void>
  findById(id: EntityId): Promise<List | null>
  listByOwner(ownerId: EntityId): Promise<List[]>
  pageAccessible(
    ownerId: EntityId,
    joinedIds: EntityId[],
    params: ListPageParams,
  ): Promise<Page<List>>
  findDailyByOwnerAndDate(
    ownerId: EntityId,
    referenceDate: Date,
  ): Promise<List | null>
  /**
   * Stores a new daily list unless the owner already has one for that date,
   * and returns whichever list holds the slot. Concurrent first loads of a day
   * therefore converge on one list.
   */
  ensureDaily(list: List): Promise<List>
  delete(id: EntityId): Promise<void>
}
