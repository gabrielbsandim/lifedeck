import type { EntityId, User } from '@lifedeck/domain'

export interface UserRepository {
  save(user: User): Promise<void>
  findById(id: EntityId): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  delete(id: EntityId): Promise<void>
}
