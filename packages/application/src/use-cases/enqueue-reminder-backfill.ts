import type { Clock } from '@/ports/clock'
import type { JobQueue } from '@/ports/job-queue'
import type { CalendarConnectionRepository } from '@/ports/calendar-connection-repository'
import { CALENDAR_PULL_JOB } from '@/use-cases/calendar-sync-jobs'

type Dependencies = {
  calendarConnections: CalendarConnectionRepository
  jobQueue: JobQueue
  clock: Clock
}

// One-shot backfill: enqueue a forced pull for every owner with a calendar
// connection, so events synced before reminder capture existed get their
// reminder offsets imported and their reminder jobs armed. Spreads the work over
// the dispatch cron by enqueuing one job per owner rather than pulling inline.
export function makeEnqueueReminderBackfill({
  calendarConnections,
  jobQueue,
  clock,
}: Dependencies) {
  return async function enqueueReminderBackfill(): Promise<{
    enqueued: number
  }> {
    const now = clock.now()
    const connections = await calendarConnections.listAll()
    const owners = [...new Set(connections.map(c => c.ownerId as string))]
    for (const userId of owners) {
      await jobQueue.enqueue({
        type: CALENDAR_PULL_JOB,
        payload: { userId, force: true },
        runAt: now,
      })
    }
    return { enqueued: owners.length }
  }
}
