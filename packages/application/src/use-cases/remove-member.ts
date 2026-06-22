import { asEntityId } from '@taskin/domain'
import { NotFoundError } from '@/errors/use-case-error'
import type { ListRepository } from '@/ports/list-repository'
import type { MembershipRepository } from '@/ports/membership-repository'

type Dependencies = {
  lists: ListRepository
  memberships: MembershipRepository
}

export function makeRemoveMember({ lists, memberships }: Dependencies) {
  return async function removeMember(
    requesterId: string,
    listId: string,
    userId: string,
  ): Promise<void> {
    const list = await lists.findById(asEntityId(listId))
    if (!list || !list.isOwnedBy(asEntityId(requesterId))) {
      throw new NotFoundError('List')
    }

    const member = await memberships.findByListAndUser(
      list.id,
      asEntityId(userId),
    )
    if (!member) {
      throw new NotFoundError('Member')
    }

    await memberships.delete(member.id)
  }
}
