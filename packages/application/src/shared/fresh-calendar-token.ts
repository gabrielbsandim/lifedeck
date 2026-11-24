import type { CalendarConnection } from '@lifedeck/domain'
import type { Clock } from '@/ports/clock'
import type { CalendarConnectionRepository } from '@/ports/calendar-connection-repository'
import type { CalendarProvider } from '@/ports/calendar-provider'

type Dependencies = {
  calendarConnections: CalendarConnectionRepository
  clock: Clock
}

export function makeEnsureFreshCalendarToken({
  calendarConnections,
  clock,
}: Dependencies) {
  return async function ensureFreshCalendarToken(
    connection: CalendarConnection,
    provider: CalendarProvider,
  ): Promise<void> {
    if (!connection.needsRefresh(clock.now())) {
      return
    }
    if (!connection.refreshToken) {
      return
    }
    const refreshed = await provider.refreshAccessToken(connection.refreshToken)
    connection.refreshAccess(
      refreshed.accessToken,
      refreshed.expiresAt,
      clock.now(),
    )
    await calendarConnections.save(connection)
  }
}
