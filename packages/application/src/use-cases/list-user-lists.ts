import { asEntityId } from '@taskin/domain'
import { type ListView } from '@/dtos/list-dto'
import { toListView } from '@/mappers/list-mapper'
import type { ListRepository } from '@/ports/list-repository'

type Dependencies = {
  lists: ListRepository
}

export function makeListUserLists({ lists }: Dependencies) {
  return async function listUserLists(ownerId: string): Promise<ListView[]> {
    const owned = await lists.listByOwner(asEntityId(ownerId))
    return owned.map(toListView)
  }
}
