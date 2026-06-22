import { asEntityId } from '@taskin/domain'
import { type MemberView } from '@/dtos/member-dto'
import { toMemberView } from '@/mappers/member-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import type { ListRepository } from '@/ports/list-repository'
import type { MembershipRepository } from '@/ports/membership-repository'
import type { UserRepository } from '@/ports/user-repository'

type Dependencies = {
  lists: ListRepository
  memberships: MembershipRepository
  users: UserRepository
}

export function makeListMembers({ lists, memberships, users }: Dependencies) {
  return async function listMembers(
    requesterId: string,
    listId: string,
  ): Promise<MemberView[]> {
    const list = await lists.findById(asEntityId(listId))
    if (!list || !list.isOwnedBy(asEntityId(requesterId))) {
      throw new NotFoundError('List')
    }

    const members = await memberships.listByList(list.id)
    return Promise.all(
      members.map(async member => {
        const user = await users.findById(member.userId)
        return toMemberView(member, user?.displayName ?? 'Member')
      }),
    )
  }
}
