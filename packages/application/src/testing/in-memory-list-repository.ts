import type { EntityId, List } from '@taskin/domain'
import type { ListRepository } from '@/ports/list-repository'

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
