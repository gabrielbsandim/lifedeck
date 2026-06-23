import { ListMember, asEntityId } from '@lifedeck/domain'
import { type MemberView } from '@/dtos/member-dto'
import { toMemberView } from '@/mappers/member-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { ListRepository } from '@/ports/list-repository'
import type { MembershipRepository } from '@/ports/membership-repository'
import type { ShareLinkRepository } from '@/ports/share-link-repository'
import type { UserRepository } from '@/ports/user-repository'
import type { UnitOfWork } from '@/ports/unit-of-work'

type Dependencies = {
  shareLinks: ShareLinkRepository
  lists: ListRepository
  memberships: MembershipRepository
  users: UserRepository
  ids: IdGenerator
  clock: Clock
  unitOfWork: UnitOfWork
}

export function makeJoinListByToken({
  shareLinks,
  lists,
  memberships,
  users,
  ids,
  clock,
  unitOfWork,
}: Dependencies) {
  return async function joinListByToken(
    requesterId: string,
    token: string,
  ): Promise<MemberView> {
    const now = clock.now()
    const link = await shareLinks.findByToken(token)
    if (!link || link.isExpired(now)) {
      throw new NotFoundError('Shared list')
    }

    const list = await lists.findById(link.listId)
    if (!list) {
      throw new NotFoundError('Shared list')
    }

    const userId = asEntityId(requesterId)
    const user = await users.findById(userId)
    const displayName = user?.displayName ?? 'Member'

    const member = await unitOfWork.run(async () => {
      const existing = await memberships.findByListAndUser(list.id, userId)
      if (existing) {
        return existing
      }
      const created = ListMember.create({
        id: ids.generate(),
        listId: list.id,
        userId,
        role: link.role,
        addedAt: now,
      })
      await memberships.save(created)
      return created
    })

    return toMemberView(member, displayName)
  }
}
