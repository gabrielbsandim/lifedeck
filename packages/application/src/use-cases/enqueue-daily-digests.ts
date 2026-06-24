import { civilHour } from '@lifedeck/domain'
import type { Clock } from '@/ports/clock'
import type { JobQueue } from '@/ports/job-queue'
import type { UserRepository } from '@/ports/user-repository'

export const DAILY_DIGEST_JOB = 'daily-digest'

const DEFAULT_DIGEST_HOUR = 7

type Dependencies = {
  users: UserRepository
  jobQueue: JobQueue
  clock: Clock
  digestHour?: number
}

export function makeEnqueueDailyDigests({
  users,
  jobQueue,
  clock,
  digestHour = DEFAULT_DIGEST_HOUR,
}: Dependencies) {
  return async function enqueueDailyDigests(): Promise<{ enqueued: number }> {
    const now = clock.now()
    const eligible = await users.listForDailyDigest()
    let enqueued = 0
    for (const user of eligible) {
      if (civilHour(now, user.timezone) !== digestHour) {
        continue
      }
      await jobQueue.enqueue({
        type: DAILY_DIGEST_JOB,
        payload: { userId: user.id as string },
        runAt: now,
      })
      enqueued += 1
    }
    return { enqueued }
  }
}
