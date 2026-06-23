import { asEntityId, type List } from '@lifedeck/domain'
import { type ListView } from '@/dtos/list-dto'
import { toListView } from '@/mappers/list-mapper'
import type { ListRepository } from '@/ports/list-repository'
import type { MembershipRepository } from '@/ports/membership-repository'

type Dependencies = {
  lists: ListRepository
  memberships: MembershipRepository
}

export function makeListUserLists({ lists, memberships }: Dependencies) {
  return async function listUserLists(ownerId: string): Promise<ListView[]> {
    const userId = asEntityId(ownerId)
    const owned = await lists.listByOwner(userId)
    const ownedIds = new Set(owned.map(list => list.id))

    const joined = await memberships.listByUser(userId)
    const joinedLists = (
      await Promise.all(
        joined
          .filter(member => !ownedIds.has(member.listId))
          .map(member => lists.findById(member.listId)),
      )
    ).filter((list): list is List => list !== null)

    return [...owned, ...joinedLists].map(toListView)
  }
}
