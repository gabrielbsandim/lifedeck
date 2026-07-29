/**
 * Tracks when the next scheduled job is due, outside the database, so the
 * fallback cron can decide whether a sweep is needed without waking a
 * scale-to-zero compute. Every method must fail open: on any doubt
 * `hasWorkBefore` answers `true` and the caller pays for a normal sweep.
 */
export interface DispatchWatermark {
  /** Lowers the recorded next run time. Never pushes it further out. */
  noteNextRun(at: Date): Promise<void>
  /** `false` only when the watermark is known and still in the future. */
  hasWorkBefore(now: Date): Promise<boolean>
  /** Records the queue state after a sweep. `null` means nothing is pending. */
  markDrained(nextRunAt: Date | null): Promise<void>
}
