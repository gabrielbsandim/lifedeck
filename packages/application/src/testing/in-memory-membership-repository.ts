import type { EntityId, ListMember } from '@lifedeck/domain'
import type { MembershipRepository } from '@/ports/membership-repository'

export class InMemoryMembershipRepository implements MembershipRepository {
  private readonly store = new Map<string, ListMember>()

  async save(member: ListMember): Promise<void> {
    this.store.set(member.id, member)
  }

  async findByListAndUser(
    listId: EntityId,
    userId: EntityId,
  ): Promise<ListMember | null> {
    return (
      [...this.store.values()].find(
        member => member.listId === listId && member.userId === userId,
      ) ?? null
    )
  }

  async listByList(listId: EntityId): Promise<ListMember[]> {
    return [...this.store.values()].filter(member => member.listId === listId)
  }

  async delete(id: EntityId): Promise<void> {
    this.store.delete(id)
  }
}
