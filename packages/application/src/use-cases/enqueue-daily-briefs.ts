import { civilHour } from '@lifedeck/domain'
import type { Clock } from '@/ports/clock'
import type { JobQueue } from '@/ports/job-queue'
import type { UserRepository } from '@/ports/user-repository'

export const DAILY_BRIEF_JOB = 'daily-brief'

type Dependencies = {
  users: UserRepository
  jobQueue: JobQueue
  clock: Clock
}

// Mirrors enqueueDailyDigests: hourly sweep that enqueues a daily-brief job for
// each opted-in user whose local hour just reached their chosen briefHour. The
// civil-hour match fires exactly once per day per user, so this is naturally
// once-per-day; entitlement, quiet hours, and the hard cap are enforced when the
// job runs (sendDailyBrief).
export function makeEnqueueDailyBriefs({
  users,
  jobQueue,
  clock,
}: Dependencies) {
  return async function enqueueDailyBriefs(): Promise<{ enqueued: number }> {
    const now = clock.now()
    const candidates = await users.listWithBriefEnabled()
    let enqueued = 0
    for (const user of candidates) {
      const briefHour = user.assistantProfile.briefHour
      if (briefHour === null || civilHour(now, user.timezone) !== briefHour) {
        continue
      }
      await jobQueue.enqueue({
        type: DAILY_BRIEF_JOB,
        payload: { userId: user.id as string },
        runAt: now,
      })
      enqueued += 1
    }
    return { enqueued }
  }
}
