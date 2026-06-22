import { ListMember, asEntityId } from '@taskin/domain'
import { type MemberView } from '@/dtos/member-dto'
import { toMemberView } from '@/mappers/member-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { ListRepository } from '@/ports/list-repository'
import type { MembershipRepository } from '@/ports/membership-repository'
import type { ShareLinkRepository } from '@/ports/share-link-repository'

type Dependencies = {
  shareLinks: ShareLinkRepository
  lists: ListRepository
  memberships: MembershipRepository
  ids: IdGenerator
  clock: Clock
}

export function makeJoinListByToken({
  shareLinks,
  lists,
  memberships,
  ids,
  clock,
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
    const existing = await memberships.findByListAndUser(list.id, userId)
    if (existing) {
      return toMemberView(existing)
    }

    const member = ListMember.create({
      id: ids.generate(),
      listId: list.id,
      userId,
      role: link.role,
      addedAt: now,
    })
    await memberships.save(member)

    return toMemberView(member)
  }
}
