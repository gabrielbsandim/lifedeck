import type { EntityId, User } from '@taskin/domain'

export interface UserRepository {
  save(user: User): Promise<void>
  findById(id: EntityId): Promise<User | null>
}
