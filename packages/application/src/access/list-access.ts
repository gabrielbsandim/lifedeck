import { asEntityId, type List } from '@taskin/domain'
import type { MembershipRepository } from '@/ports/membership-repository'

export type ListAccess = {
  canRead: boolean
  canEdit: boolean
}

export async function resolveListAccess(
  list: List,
  requesterId: string | null,
  memberships: MembershipRepository,
): Promise<ListAccess> {
  if (requesterId !== null && list.isOwnedBy(asEntityId(requesterId))) {
    return { canRead: true, canEdit: true }
  }

  if (requesterId !== null) {
    const member = await memberships.findByListAndUser(
      list.id,
      asEntityId(requesterId),
    )
    if (member) {
      return { canRead: true, canEdit: member.isEditor }
    }
  }

  if (list.visibility === 'link') {
    return { canRead: true, canEdit: false }
  }

  return { canRead: false, canEdit: false }
}
