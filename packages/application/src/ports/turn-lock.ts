export type ReleaseTurnLock = () => Promise<void>

// One assistant turn per user at a time. Both channels share one history, and two
// messages sent a second apart would otherwise each load it before either saves.
export interface TurnLock {
  // Null when an earlier turn still holds the lock after the implementation's wait.
  acquire(userId: string): Promise<ReleaseTurnLock | null>
}
