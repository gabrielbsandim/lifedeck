import type { EntityId, User } from '@lifedeck/domain'
import type { UserRepository } from '@/ports/user-repository'

export class InMemoryUserRepository implements UserRepository {
  private readonly store = new Map<string, User>()

  async save(user: User): Promise<void> {
    this.store.set(user.id, user)
  }

  async findById(id: EntityId): Promise<User | null> {
    return this.store.get(id) ?? null
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase()
    for (const user of this.store.values()) {
      if (user.email === normalized) {
        return user
      }
    }
    return null
  }

  async listForDailyDigest(): Promise<User[]> {
    return [...this.store.values()].filter(user => user.email !== null)
  }

  async listWithBriefEnabled(): Promise<User[]> {
    return [...this.store.values()].filter(
      user => !user.isGuest && user.assistantProfile.briefEnabled,
    )
  }

  async listWithNudgesEnabled(): Promise<User[]> {
    return [...this.store.values()].filter(
      user => !user.isGuest && user.assistantProfile.nudgesEnabled,
    )
  }

  async delete(id: EntityId): Promise<void> {
    this.store.delete(id)
  }
}
