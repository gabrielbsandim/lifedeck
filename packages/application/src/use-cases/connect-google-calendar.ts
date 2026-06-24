import { CalendarConnection, asEntityId } from '@lifedeck/domain'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { CalendarConnectionRepository } from '@/ports/calendar-connection-repository'
import type { CalendarProvider } from '@/ports/calendar-provider'

type Dependencies = {
  calendarConnections: CalendarConnectionRepository
  provider: CalendarProvider
  ids: IdGenerator
  clock: Clock
}

export function makeConnectGoogleCalendar({
  calendarConnections,
  provider,
  ids,
  clock,
}: Dependencies) {
  return async function connectGoogleCalendar(
    ownerId: string,
    code: string,
    redirectUri: string,
  ): Promise<{ connected: boolean }> {
    const tokens = await provider.exchangeCode(code, redirectUri)
    const existing = await calendarConnections.findByOwner(asEntityId(ownerId))

    if (existing) {
      existing.refreshAccess(tokens.accessToken, tokens.expiresAt, clock.now())
      await calendarConnections.save(existing)
      return { connected: true }
    }

    const connection = CalendarConnection.create({
      id: ids.generate(),
      ownerId: asEntityId(ownerId),
      provider: provider.provider,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.expiresAt,
      now: clock.now(),
    })
    await calendarConnections.save(connection)
    return { connected: true }
  }
}
