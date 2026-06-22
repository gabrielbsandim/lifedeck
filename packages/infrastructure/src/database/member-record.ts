import { ListMember, asEntityId } from '@taskin/domain'
import type { MemberRole } from '@taskin/domain'

export type MemberRecord = {
  id: string
  listId: string
  userId: string
  role: MemberRole
  addedAt: Date
}

export function toDomainMember(record: MemberRecord): ListMember {
  return ListMember.restore({
    id: asEntityId(record.id),
    listId: asEntityId(record.listId),
    userId: asEntityId(record.userId),
    role: record.role,
    addedAt: record.addedAt,
  })
}

export function toMemberRecord(member: ListMember): MemberRecord {
  const props = member.toJSON()
  return {
    id: props.id,
    listId: props.listId,
    userId: props.userId,
    role: props.role,
    addedAt: props.addedAt,
  }
}
