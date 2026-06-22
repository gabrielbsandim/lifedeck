import type { ListMember } from '@taskin/domain'
import type { MemberView } from '@/dtos/member-dto'

export function toMemberView(member: ListMember): MemberView {
  const props = member.toJSON()
  return {
    id: props.id,
    listId: props.listId,
    userId: props.userId,
    role: props.role,
    addedAt: props.addedAt.toISOString(),
  }
}
