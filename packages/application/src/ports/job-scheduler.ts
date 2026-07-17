/**
 * Schedules a "wake" that triggers the job dispatcher at (or shortly after) a
 * given time, so a due job runs without waiting for the periodic fallback
 * sweep. Implementations must be best-effort: a failed wake never breaks the
 * enqueue path, because the persisted job (the outbox) is the source of truth
 * and the fallback cron still drains it. See docs and OutboxJobQueue.
 */
export interface JobScheduler {
  scheduleWake(at: Date): Promise<void>
}
