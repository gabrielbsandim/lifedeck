import { asEntityId } from '@lifedeck/domain'
import { type ListView } from '@/dtos/list-dto'
import { toListView } from '@/mappers/list-mapper'
import type { Page } from '@/pagination'
import type { ListPageParams, ListRepository } from '@/ports/list-repository'
import type { MembershipRepository } from '@/ports/membership-repository'

type Dependencies = {
  lists: ListRepository
  memberships: MembershipRepository
}

export function makeListUserLists({ lists, memberships }: Dependencies) {
  return async function listUserLists(
    ownerId: string,
    params: ListPageParams,
  ): Promise<Page<ListView>> {
    const userId = asEntityId(ownerId)
    const joined = await memberships.listByUser(userId)
    const joinedIds = joined.map(member => member.listId)

    const page = await lists.pageAccessible(userId, joinedIds, params)
    return {
      items: page.items.map(toListView),
      nextCursor: page.nextCursor,
    }
  }
}
