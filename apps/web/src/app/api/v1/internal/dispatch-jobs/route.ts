import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { isAuthorizedCron } from '@/server/api/cron-guard'

// A large batch of due jobs (reminders, digests, calendar reconcile) must not
// be cut off mid-dispatch by the default duration.
export const maxDuration = 300

export async function POST(request: Request) {
  try {
    if (!isAuthorizedCron(request)) {
      return fail('UNAUTHORIZED', 'Invalid cron credentials.', 401)
    }
    const result = await getContainer().dispatchDueJobs()
    return ok(result)
  } catch (error) {
    return handleError(error)
  }
}

// Vercel Cron invokes endpoints with GET; reuse the same guarded handler.
export const GET = POST
