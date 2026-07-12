import type { Clock } from '@/ports/clock'
import type { JobQueue } from '@/ports/job-queue'
import type { CalendarConnectionRepository } from '@/ports/calendar-connection-repository'
import { CALENDAR_WATCH_JOB } from '@/use-cases/calendar-sync-jobs'

const DEFAULT_RENEW_WITHIN_MS = 24 * 60 * 60 * 1000

type Dependencies = {
  calendarConnections: CalendarConnectionRepository
  jobQueue: JobQueue
  clock: Clock
  renewWithinMs?: number
}

export function makeRenewCalendarChannels({
  calendarConnections,
  jobQueue,
  clock,
  renewWithinMs = DEFAULT_RENEW_WITHIN_MS,
}: Dependencies) {
  return async function renewCalendarChannels(): Promise<{ enqueued: number }> {
    const now = clock.now()
    const threshold = now.getTime() + renewWithinMs
    const connections = await calendarConnections.listAll()
    // Renewing runs per owner (watch re-registers all of the owner's channels),
    // so collapse owners with any soon-to-expire channel to a single job.
    const dueOwners = new Set<string>()
    for (const connection of connections) {
      const expiresAt = connection.channelExpiresAt
      if (!connection.channelId || !expiresAt) {
        continue
      }
      if (expiresAt.getTime() > threshold) {
        continue
      }
      dueOwners.add(connection.ownerId as string)
    }
    for (const userId of dueOwners) {
      await jobQueue.enqueue({
        type: CALENDAR_WATCH_JOB,
        payload: { userId },
        runAt: now,
      })
    }
    return { enqueued: dueOwners.size }
  }
}
