import { asEntityId } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
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
  ): Promise<void> {
    const connection = await calendarConnections.findByOwner(
      asEntityId(ownerId),
    )
    if (!connection) {
      throw new NotFoundError('Calendar connection')
    }
    const channel = await provider.watch(connection, callbackUrl)
    connection.setChannel(
      channel.channelId,
      channel.resourceId,
      channel.expiresAt,
      clock.now(),
    )
    await calendarConnections.save(connection)
  }
}
