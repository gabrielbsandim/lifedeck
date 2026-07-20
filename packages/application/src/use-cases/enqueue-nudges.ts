import { civilHour } from '@lifedeck/domain'
import type { Clock } from '@/ports/clock'
import type { JobQueue } from '@/ports/job-queue'
import type { UserRepository } from '@/ports/user-repository'

export const NUDGE_JOB = 'nudge'

type Dependencies = {
  users: Pick<UserRepository, 'listWithNudgesEnabled'>
  jobQueue: JobQueue
  clock: Clock
  // The fixed local hour (0-23) the evening nudge scan runs at.
  nudgeHour: number
}

// Daily sweep: at each user's local nudge hour, enqueue a nudge job. Like the
// brief/check-in sweeps, this is naturally once-per-day per user; the plan gate,
// quiet hours, the ≤1/day cap, and the actual rule detection all run at send time
// (sendNudge), so this stays a cheap hour-match over the opted-in candidates.
export function makeEnqueueNudges({
  users,
  jobQueue,
  clock,
  nudgeHour,
}: Dependencies) {
  return async function enqueueNudges(): Promise<{ enqueued: number }> {
    const now = clock.now()
    const candidates = await users.listWithNudgesEnabled()
    let enqueued = 0
    for (const user of candidates) {
      if (civilHour(now, user.timezone) !== nudgeHour) {
        continue
      }
      await jobQueue.enqueue({
        type: NUDGE_JOB,
        payload: { userId: user.id as string },
        runAt: now,
      })
      enqueued += 1
    }
    return { enqueued }
  }
}
