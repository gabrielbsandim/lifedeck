import type { EntityId, User } from '@taskin/domain'
import type { UserRepository } from '@/ports/user-repository'

export class InMemoryUserRepository implements UserRepository {
  private readonly store = new Map<string, User>()

  async save(user: User): Promise<void> {
    this.store.set(user.id, user)
  }

  async findById(id: EntityId): Promise<User | null> {
    return this.store.get(id) ?? null
  }
}
