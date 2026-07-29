import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { isAuthorizedCron } from '@/server/api/cron-guard'
import { warmDb } from '@/server/db/warm-db'

// A large batch of due jobs (reminders, digests, calendar reconcile) must not
// be cut off mid-dispatch by the default duration.
export const maxDuration = 300

export async function POST(request: Request) {
  try {
    if (!isAuthorizedCron(request)) {
      return fail('UNAUTHORIZED', 'Invalid cron credentials.', 401)
    }
    // QStash wakes this route on time for every enqueued job, so most fallback
    // sweeps have nothing to do. Ask Redis first and skip the database entirely
    // when the queue is known to be empty, letting the compute stay suspended.
    // The check fails open, so a Redis outage only costs the old behaviour.
    const container = getContainer()
    const hasWork = await container
      .hasDueJobs(new Date())
      .catch(() => true as const)
    if (!hasWork) {
      return ok({ processed: 0, succeeded: 0, failed: 0, skipped: true })
    }
    // Resume a scaled-to-zero Neon compute before dispatching, so the first
    // query does not fail on the cold start.
    await warmDb()
    const result = await container.dispatchDueJobs()
    return ok({ ...result, skipped: false })
  } catch (error) {
    return handleError(error)
  }
}

// Vercel Cron invokes endpoints with GET; reuse the same guarded handler.
export const GET = POST
