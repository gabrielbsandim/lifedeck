import type { EntityId, List } from '@taskin/domain'

export interface ListRepository {
  save(list: List): Promise<void>
  findById(id: EntityId): Promise<List | null>
  listByOwner(ownerId: EntityId): Promise<List[]>
}
