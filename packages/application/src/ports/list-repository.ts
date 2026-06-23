import type { EntityId, List } from '@lifedeck/domain'

export interface ListRepository {
  save(list: List): Promise<void>
  findById(id: EntityId): Promise<List | null>
  listByOwner(ownerId: EntityId): Promise<List[]>
  findDailyByOwnerAndDate(
    ownerId: EntityId,
    referenceDate: Date,
  ): Promise<List | null>
  delete(id: EntityId): Promise<void>
}
