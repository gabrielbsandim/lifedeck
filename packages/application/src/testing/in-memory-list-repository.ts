import type { EntityId, List } from '@lifedeck/domain'
import { type Page, paginateByCreatedAt } from '@/pagination'
import type { ListPageParams, ListRepository } from '@/ports/list-repository'

export class InMemoryListRepository implements ListRepository {
  private readonly store = new Map<string, List>()

  async save(list: List): Promise<void> {
    this.store.set(list.id, list)
  }

  async findById(id: EntityId): Promise<List | null> {
    return this.store.get(id) ?? null
  }

  async delete(id: EntityId): Promise<void> {
    this.store.delete(id)
  }

  async listByOwner(ownerId: EntityId): Promise<List[]> {
    return [...this.store.values()].filter(list => list.ownerId === ownerId)
  }

  async pageAccessible(
    ownerId: EntityId,
    joinedIds: EntityId[],
    params: ListPageParams,
  ): Promise<Page<List>> {
    const allowed = new Set<string>(joinedIds)
    const accessible = [...this.store.values()].filter(
      list => list.ownerId === ownerId || allowed.has(list.id),
    )
    const filtered =
      params.type === null
        ? accessible
        : accessible.filter(list => list.toJSON().type === params.type)
    return paginateByCreatedAt(filtered, params, list => ({
      createdAt: list.toJSON().createdAt,
      id: list.id,
    }))
  }

  async findDailyByOwnerAndDate(
    ownerId: EntityId,
    referenceDate: Date,
  ): Promise<List | null> {
    const target = referenceDate.getTime()
    const match = [...this.store.values()].find(list => {
      const props = list.toJSON()
      return (
        props.ownerId === ownerId &&
        props.type === 'daily' &&
        props.referenceDate !== null &&
        props.referenceDate.getTime() === target
      )
    })
    return match ?? null
  }
}
