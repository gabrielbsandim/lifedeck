import type { EntityId, User } from '@lifedeck/domain'

export interface UserRepository {
  save(user: User): Promise<void>
  findById(id: EntityId): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  listForDailyDigest(): Promise<User[]>
  // Non-guest users who opted into the daily brief, so the sweep only scans the
  // few candidates instead of the whole table.
  listWithBriefEnabled(): Promise<User[]>
  // Non-guest users who have not opted out of nudges (default on), the candidate
  // set the evening nudge sweep scans; the plan gate is applied at send time.
  listWithNudgesEnabled(): Promise<User[]>
  delete(id: EntityId): Promise<void>
}
