import type { EntityId } from '@lifedeck/domain'

// A dedup + rate-limit ledger for proactive nudges. `key` identifies the rule
// and target (e.g. `carried_task:<taskId>`), `date` is the civil date sent.
export type NudgeLogEntry = {
  id: EntityId
  userId: EntityId
  key: string
  date: string
  createdAt: Date
}

export interface NudgeLogRepository {
  // Was any nudge sent to this user on this civil date? (the ≤1/day cap)
  hasSentOn(userId: EntityId, date: string): Promise<boolean>
  // The most recent civil date this exact nudge (user + key) was sent, or null.
  lastSentDate(userId: EntityId, key: string): Promise<string | null>
  record(entry: NudgeLogEntry): Promise<void>
}
