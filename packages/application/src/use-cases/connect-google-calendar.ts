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

export type ConnectCalendarResult = {
  connected: boolean
  connectionId: string
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
  ): Promise<ConnectCalendarResult> {
    const owner = asEntityId(ownerId)
    const tokens = await provider.exchangeCode(code, redirectUri)
    const existing = await calendarConnections.listByOwner(owner)

    // Re-connecting the same Google account refreshes that connection in place
    // rather than creating a duplicate; a different account adds a new one.
    const sameAccount = existing.find(
      connection =>
        connection.accountEmail !== null &&
        connection.accountEmail === tokens.accountEmail,
    )
    // A single legacy connection (created before we captured the account email)
    // is treated as the same account on reconnect, so it is adopted and
    // backfilled instead of silently duplicated.
    const legacySingle =
      !sameAccount &&
      existing.length === 1 &&
      existing[0]?.accountEmail === null
        ? existing[0]
        : undefined
    const match = sameAccount ?? legacySingle
    if (match) {
      match.refreshAccess(tokens.accessToken, tokens.expiresAt, clock.now())
      if (match.accountEmail === null && tokens.accountEmail) {
        match.setAccountEmail(tokens.accountEmail, clock.now())
      }
      await calendarConnections.save(match)
      return { connected: true, connectionId: match.id as string }
    }

    const connection = CalendarConnection.create({
      id: ids.generate(),
      ownerId: owner,
      provider: provider.provider,
      accountEmail: tokens.accountEmail,
      // The first calendar a user connects becomes the default target for the
      // events they create locally.
      isDefault: existing.length === 0,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.expiresAt,
      now: clock.now(),
    })
    await calendarConnections.save(connection)
    return { connected: true, connectionId: connection.id as string }
  }
}
