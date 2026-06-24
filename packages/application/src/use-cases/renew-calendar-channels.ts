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
    let enqueued = 0
    for (const connection of connections) {
      const expiresAt = connection.channelExpiresAt
      if (!connection.channelId || !expiresAt) {
        continue
      }
      if (expiresAt.getTime() > threshold) {
        continue
      }
      await jobQueue.enqueue({
        type: CALENDAR_WATCH_JOB,
        payload: { userId: connection.ownerId as string },
        runAt: now,
      })
      enqueued += 1
    }
    return { enqueued }
  }
}
