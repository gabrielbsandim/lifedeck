import type { Clock } from '@/ports/clock'
import type { CalendarConnectionRepository } from '@/ports/calendar-connection-repository'
import type { JobQueue } from '@/ports/job-queue'
import { CALENDAR_PULL_JOB } from '@/use-cases/calendar-sync-jobs'

type Dependencies = {
  calendarConnections: CalendarConnectionRepository
  jobQueue: JobQueue
  clock: Clock
}

export function makeHandleCalendarNotification({
  calendarConnections,
  jobQueue,
  clock,
}: Dependencies) {
  return async function handleCalendarNotification(
    channelId: string,
  ): Promise<{ enqueued: boolean }> {
    const connection = await calendarConnections.findByChannelId(channelId)
    if (!connection) {
      return { enqueued: false }
    }
    await jobQueue.enqueue({
      type: CALENDAR_PULL_JOB,
      payload: { userId: connection.ownerId as string },
      runAt: clock.now(),
    })
    return { enqueued: true }
  }
}
