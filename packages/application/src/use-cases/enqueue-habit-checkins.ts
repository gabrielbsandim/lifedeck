import { DEFAULT_TIME_ZONE, civilHour } from '@lifedeck/domain'
import type { Clock } from '@/ports/clock'
import type { JobQueue } from '@/ports/job-queue'
import type { HabitRepository } from '@/ports/habit-repository'
import type { UserRepository } from '@/ports/user-repository'

export const HABIT_CHECKIN_JOB = 'habit-checkin'

type Dependencies = {
  habits: HabitRepository
  users: Pick<UserRepository, 'findById'>
  jobQueue: JobQueue
  clock: Clock
}

// Hourly sweep, like enqueueDailyBriefs: for each active habit whose owner's
// local hour just reached the habit's check-in hour, enqueue a check-in job. The
// civil-hour match fires once per day; entitlement, cadence-due, already-done,
// and the hard cap are all enforced when the job runs (sendHabitCheckin).
export function makeEnqueueHabitCheckins({
  habits,
  users,
  jobQueue,
  clock,
}: Dependencies) {
  return async function enqueueHabitCheckins(): Promise<{ enqueued: number }> {
    const now = clock.now()
    const candidates = await habits.listActiveWithCheckin()
    // Cache each owner's timezone so several habits for one user cost one lookup.
    const timezones = new Map<string, string>()
    let enqueued = 0
    for (const habit of candidates) {
      let timezone = timezones.get(habit.ownerId)
      if (timezone === undefined) {
        const owner = await users.findById(habit.ownerId)
        timezone = owner?.timezone ?? DEFAULT_TIME_ZONE
        timezones.set(habit.ownerId, timezone)
      }
      // The repo only returns habits with a check-in hour set, so the compare
      // against the owner's local hour is the single gate here.
      if (civilHour(now, timezone) !== habit.checkinHour) {
        continue
      }
      await jobQueue.enqueue({
        type: HABIT_CHECKIN_JOB,
        payload: {
          userId: habit.ownerId as string,
          habitId: habit.id as string,
        },
        runAt: now,
      })
      enqueued += 1
    }
    return { enqueued }
  }
}
