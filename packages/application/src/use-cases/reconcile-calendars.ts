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
    for (const connection of connections) {
      await jobQueue.enqueue({
        type: CALENDAR_PULL_JOB,
        payload: { userId: connection.ownerId as string },
        runAt: now,
      })
    }
    return { enqueued: connections.length }
  }
}
