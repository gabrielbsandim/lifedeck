import type { EntityId, ListMember } from '@lifedeck/domain'

export interface MembershipRepository {
  save(member: ListMember): Promise<void>
  findByListAndUser(
    listId: EntityId,
    userId: EntityId,
  ): Promise<ListMember | null>
  listByList(listId: EntityId): Promise<ListMember[]>
  delete(id: EntityId): Promise<void>
}
