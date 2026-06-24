import { asEntityId, ValidationError } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import type { ListRepository } from '@/ports/list-repository'
import type { MembershipRepository } from '@/ports/membership-repository'

type Dependencies = {
  lists: ListRepository
  memberships: MembershipRepository
}

export function makeLeaveList({ lists, memberships }: Dependencies) {
  return async function leaveList(
    requesterId: string,
    listId: string,
  ): Promise<void> {
    const list = await lists.findById(asEntityId(listId))
    if (!list) {
      throw new NotFoundError('List')
    }
    if (list.isOwnedBy(asEntityId(requesterId))) {
      throw new ValidationError('The owner cannot leave their own list.')
    }

    const member = await memberships.findByListAndUser(
      list.id,
      asEntityId(requesterId),
    )
    if (!member) {
      throw new NotFoundError('Member')
    }

    await memberships.delete(member.id)
  }
}
