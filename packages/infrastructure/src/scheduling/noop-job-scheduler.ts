import type { JobScheduler } from '@lifedeck/application'

/**
 * Fallback scheduler used when QStash is not configured. It does nothing: the
 * persisted job still gets drained by the periodic fallback cron, just without
 * the on-time wake. Lets the app run locally and in tests with no external
 * scheduler.
 */
export class NoopJobScheduler implements JobScheduler {
  async scheduleWake(_at: Date): Promise<void> {
    // Intentionally a no-op; the fallback cron is the safety net.
  }
}
