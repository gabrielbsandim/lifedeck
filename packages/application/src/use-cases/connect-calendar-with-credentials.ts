import {
  CalendarConnection,
  ValidationError,
  asEntityId,
  type CalendarProviderName,
} from '@lifedeck/domain'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { CalendarConnectionRepository } from '@/ports/calendar-connection-repository'
import type { CalendarProviderRegistry } from '@/ports/calendar-provider'
import type { ConnectCalendarResult } from '@/use-cases/connect-google-calendar'

type Dependencies = {
  calendarConnections: CalendarConnectionRepository
  providers: CalendarProviderRegistry
  ids: IdGenerator
  clock: Clock
}

// Connect a static-credential provider (Apple app-specific password, cal.com
// API key). The adapter validates the secret and resolves the account label +
// calendar to sync; reconnecting the same account updates it in place.
export function makeConnectCalendarWithCredentials({
  calendarConnections,
  providers,
  ids,
  clock,
}: Dependencies) {
  return async function connectCalendarWithCredentials(
    ownerId: string,
    input: {
      provider: CalendarProviderName
      accountEmail: string
      secret: string
    },
  ): Promise<ConnectCalendarResult> {
    const owner = asEntityId(ownerId)
    const provider = providers.get(input.provider)
    if (!provider.connectWithCredentials) {
      throw new ValidationError(
        `The ${input.provider} calendar cannot be connected with a credential.`,
      )
    }

    // Validates the secret and discovers the account + calendar collection; a
    // bad credential throws here, before anything is persisted.
    const resolved = await provider.connectWithCredentials({
      accountEmail: input.accountEmail,
      secret: input.secret,
    })

    const existing = await calendarConnections.listByOwner(owner)
    // Reconnecting the same account rotates the stored secret in place (the DB
    // uniqueness is per owner+provider+account), rather than duplicating it.
    const match = existing.find(
      connection =>
        connection.provider === input.provider &&
        connection.accountEmail !== null &&
        connection.accountEmail === resolved.accountEmail,
    )
    if (match) {
      const now = clock.now()
      match.refreshAccess(input.secret, null, now)
      // Re-point at whatever calendar the adapter resolved this time; it may
      // differ from the one stored on the original connection.
      match.setCalendarId(resolved.calendarId, now)
      await calendarConnections.save(match)
      return { connected: true, connectionId: match.id as string }
    }

    const writable = provider.writable !== false
    const connection = CalendarConnection.create({
      id: ids.generate(),
      ownerId: owner,
      provider: input.provider,
      accountEmail: resolved.accountEmail,
      // Only a writable calendar becomes the default push target, and only when
      // no default exists yet; a read-only provider (cal.com) never is one.
      isDefault: writable && !existing.some(connection => connection.isDefault),
      accessToken: input.secret,
      calendarId: resolved.calendarId,
      now: clock.now(),
    })
    await calendarConnections.save(connection)
    return { connected: true, connectionId: connection.id as string }
  }
}
