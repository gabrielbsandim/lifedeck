import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { isAuthorizedCron } from '@/server/api/cron-guard'
import { warmDb } from '@/server/db/warm-db'

// One-shot backfill: enqueue a forced calendar pull per connected owner so
// events synced before reminder capture get their reminders imported and armed.
// Guarded like the crons; invoke once after deploying, then it can be retired.
export const maxDuration = 300

export async function POST(request: Request) {
  try {
    if (!isAuthorizedCron(request)) {
      return fail('UNAUTHORIZED', 'Invalid cron credentials.', 401)
    }
    await warmDb()
    const result = await getContainer().enqueueReminderBackfill()
    return ok(result)
  } catch (error) {
    return handleError(error)
  }
}

// Vercel Cron and manual curls invoke with GET; reuse the guarded handler.
export const GET = POST
