import type { ListMember } from '@taskin/domain'
import type { MemberView } from '@/dtos/member-dto'

export function toMemberView(
  member: ListMember,
  displayName: string,
): MemberView {
  const props = member.toJSON()
  return {
    id: props.id,
    listId: props.listId,
    userId: props.userId,
    displayName,
    role: props.role,
    addedAt: props.addedAt.toISOString(),
  }
}
