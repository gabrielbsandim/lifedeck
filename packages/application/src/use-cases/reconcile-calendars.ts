import type { Clock } from '@/ports/clock'
import type { JobQueue } from '@/ports/job-queue'
import type { CalendarConnectionRepository } from '@/ports/calendar-connection-repository'
import { CALENDAR_PULL_JOB } from '@/use-cases/calendar-sync-jobs'

type Dependencies = {
  calendarConnections: CalendarConnectionRepository
  jobQueue: JobQueue
  clock: Clock
}

export function makeReconcileCalendars({
  calendarConnections,
  jobQueue,
  clock,
}: Dependencies) {
  return async function reconcileCalendars(): Promise<{ enqueued: number }> {
    const now = clock.now()
    const connections = await calendarConnections.listAll()
    // One pull per owner; the pull use case fans out over all of the owner's
    // connections, so enqueuing per-connection would just duplicate work.
    const owners = [...new Set(connections.map(c => c.ownerId as string))]
    for (const userId of owners) {
      await jobQueue.enqueue({
        type: CALENDAR_PULL_JOB,
        payload: { userId },
        runAt: now,
      })
    }
    return { enqueued: owners.length }
  }
}
