import type { EntityId } from '@lifedeck/domain'

export interface SessionRevocationStore {
  validFrom(userId: EntityId): Promise<Date | null>
  revokeAll(userId: EntityId, at: Date): Promise<void>
}
