import type { EntityId } from '@lifedeck/domain'
import type { SessionRevocationStore } from '@/ports/session-revocation-store'

export class InMemorySessionRevocationStore implements SessionRevocationStore {
  private readonly items = new Map<string, Date>()

  async validFrom(userId: EntityId): Promise<Date | null> {
    return this.items.get(userId) ?? null
  }

  async revokeAll(userId: EntityId, at: Date): Promise<void> {
    this.items.set(userId, at)
  }
}
