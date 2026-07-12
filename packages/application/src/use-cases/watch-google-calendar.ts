import { asEntityId } from '@lifedeck/domain'
import type { Clock } from '@/ports/clock'
import type { CalendarConnectionRepository } from '@/ports/calendar-connection-repository'
import type { CalendarProvider } from '@/ports/calendar-provider'

type Dependencies = {
  calendarConnections: CalendarConnectionRepository
  provider: CalendarProvider
  clock: Clock
}

export function makeWatchGoogleCalendar({
  calendarConnections,
  provider,
  clock,
}: Dependencies) {
  return async function watchGoogleCalendar(
    ownerId: string,
    callbackUrl: string,
  ): Promise<{ watched: number }> {
    const connections = await calendarConnections.listByOwner(
      asEntityId(ownerId),
    )
    let watched = 0
    for (const connection of connections) {
      try {
        const channel = await provider.watch(connection, callbackUrl)
        connection.setChannel(
          channel.channelId,
          channel.resourceId,
          channel.expiresAt,
          clock.now(),
        )
        await calendarConnections.save(connection)
        watched += 1
      } catch {
        // A single connection failing to open a channel must not stop the
        // others; the periodic channel renewal retries this one.
      }
    }
    return { watched }
  }
}
