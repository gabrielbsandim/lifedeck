import type { Clock } from '@/ports/clock'
import type { Logger } from '@/ports/logger'
import type { ScheduledJobRepository } from '@/ports/scheduled-job-repository'

export type JobHandler = (payload: Record<string, unknown>) => Promise<void>

export type DispatchResult = {
  processed: number
  succeeded: number
  failed: number
}

type Dependencies = {
  scheduledJobs: ScheduledJobRepository
  handlers: Record<string, JobHandler>
  clock: Clock
  logger?: Logger
  maxAttempts?: number
  backoff?: (attempt: number) => number
  leaseMs?: number
}

const DEFAULT_MAX_ATTEMPTS = 5
const DEFAULT_LEASE_MS = 5 * 60_000

function defaultBackoff(attempt: number): number {
  return Math.min(2 ** attempt, 60) * 60_000
}

export function makeDispatchDueJobs({
  scheduledJobs,
  handlers,
  clock,
  logger,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  backoff = defaultBackoff,
  leaseMs = DEFAULT_LEASE_MS,
}: Dependencies) {
  return async function dispatchDueJobs(limit = 50): Promise<DispatchResult> {
    const now = clock.now()
    const due = await scheduledJobs.claimDue(
      now,
      limit,
      new Date(now.getTime() + leaseMs),
    )
    let succeeded = 0
    let failed = 0

    for (const job of due) {
      const handler = handlers[job.type]
      if (!handler) {
        job.markFailed(`No handler for job type "${job.type}".`, null)
        await scheduledJobs.save(job)
        // An unhandled type never recovers on its own, so surface it loudly.
        logger?.error('job_dispatch_no_handler', {
          jobId: job.id as string,
          type: job.type,
        })
        failed += 1
        continue
      }

      try {
        await handler(job.payload)
        job.markDone()
        await scheduledJobs.save(job)
        succeeded += 1
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const nextAttempt = job.attempts + 1
        const retryAt =
          nextAttempt < maxAttempts
            ? new Date(now.getTime() + backoff(nextAttempt))
            : null
        job.markFailed(message, retryAt)
        await scheduledJobs.save(job)
        // Job failures are otherwise only recorded on the job row, invisible in
        // logs. Surface them so a silently-failing push/reminder is diagnosable:
        // 'error' once retries are exhausted (the work is lost), 'warn' while it
        // will still retry.
        const meta = {
          jobId: job.id as string,
          type: job.type,
          attempts: nextAttempt,
          error: message,
        }
        if (retryAt) {
          logger?.warn('job_dispatch_retry', {
            ...meta,
            retryAt: retryAt.toISOString(),
          })
        } else {
          logger?.error('job_dispatch_exhausted', meta)
        }
        failed += 1
      }
    }

    return { processed: due.length, succeeded, failed }
  }
}
