import {
  CalendarEvent,
  asEntityId,
  type CalendarConnection,
} from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { CalendarConnectionRepository } from '@/ports/calendar-connection-repository'
import type { CalendarEventRepository } from '@/ports/calendar-event-repository'
import type {
  CalendarProviderRegistry,
  ExternalCalendarEvent,
} from '@/ports/calendar-provider'

type Dependencies = {
  calendarConnections: CalendarConnectionRepository
  calendarEvents: CalendarEventRepository
  providers: CalendarProviderRegistry
  ids: IdGenerator
  clock: Clock
}

export type CalendarPullResult = {
  applied: number
}

export function makePullCalendarChanges({
  calendarConnections,
  calendarEvents,
  providers,
  ids,
  clock,
}: Dependencies) {
  return async function pullCalendarChanges(
    ownerId: string,
  ): Promise<CalendarPullResult> {
    const owner = asEntityId(ownerId)
    const connections = await calendarConnections.listByOwner(owner)
    if (connections.length === 0) {
      throw new NotFoundError('Calendar connection')
    }

    let applied = 0
    for (const connection of connections) {
      try {
        applied += await pullConnection(connection)
      } catch {
        // One connection failing (e.g. a revoked grant) must not block the
        // user's other calendars. The periodic reconcile retries this one.
      }
    }
    return { applied }

    async function pullConnection(
      connection: CalendarConnection,
    ): Promise<number> {
      const provider = providers.get(connection.provider)
      if (connection.needsRefresh(clock.now())) {
        const refreshed = await provider.refreshAccessToken(
          connection.refreshToken,
        )
        connection.refreshAccess(
          refreshed.accessToken,
          refreshed.expiresAt,
          clock.now(),
        )
        await calendarConnections.save(connection)
      }

      const page = await provider.listChanges(connection)
      let count = 0
      for (const external of page.events) {
        if (await applyExternal(connection, external)) {
          count += 1
        }
      }

      connection.setSyncToken(page.nextSyncToken, clock.now())
      await calendarConnections.save(connection)
      return count
    }

    async function applyExternal(
      connection: CalendarConnection,
      external: ExternalCalendarEvent,
    ): Promise<boolean> {
      // Prefer the copy already tagged to THIS connection. Google reuses the
      // same event id across a user's calendars, so an owner-wide lookup could
      // return another calendar's copy; scope by connection to avoid that.
      const tagged = await calendarEvents.findByExternalId(
        owner,
        external.externalId,
        connection.id,
      )
      // Otherwise adopt a legacy copy synced before connections were tagged
      // (connectionId still null); a copy tagged to a different connection is a
      // separate event and left alone.
      const legacy = tagged
        ? null
        : await calendarEvents.findByExternalId(owner, external.externalId)
      const existing =
        tagged ?? (legacy && legacy.connectionId === null ? legacy : null)

      // An override of a single recurring occurrence (edited or cancelled).
      // Stored as its own row keyed by the series master + original start;
      // never deletes a row, since a cancelled instance must still hide that
      // one occurrence during expansion.
      if (external.recurringEventExternalId) {
        if (existing) {
          if (external.updatedAt.getTime() <= existing.updatedAt.getTime()) {
            return false
          }
          existing.update(
            {
              title: external.title,
              description: external.description,
              location: external.location,
              startsAt: external.startsAt,
              endsAt: external.endsAt,
              allDay: external.allDay,
              cancelled: external.cancelledOccurrence,
            },
            clock.now(),
          )
          existing.linkToExternal(
            external.externalId,
            external.etag,
            clock.now(),
            connection.id,
          )
          await calendarEvents.save(existing)
          return true
        }
        const override = CalendarEvent.create({
          id: ids.generate(),
          ownerId: owner,
          title: external.title,
          description: external.description,
          location: external.location,
          startsAt: external.startsAt,
          endsAt: external.endsAt,
          allDay: external.allDay,
          recurrenceMasterExternalId: external.recurringEventExternalId,
          originalStartsAt: external.originalStartsAt,
          cancelled: external.cancelledOccurrence,
          source: 'google',
          connectionId: connection.id,
          externalId: external.externalId,
          etag: external.etag,
          now: clock.now(),
        })
        override.markSynced(external.etag, clock.now())
        await calendarEvents.save(override)
        return true
      }

      if (external.deleted) {
        if (existing) {
          await calendarEvents.delete(existing.id)
          return true
        }
        return false
      }

      if (existing) {
        // Last-writer-wins: only adopt the remote change when it is newer
        // than what we hold locally.
        if (external.updatedAt.getTime() <= existing.updatedAt.getTime()) {
          return false
        }
        existing.update(
          {
            title: external.title,
            description: external.description,
            location: external.location,
            startsAt: external.startsAt,
            endsAt: external.endsAt,
            allDay: external.allDay,
            recurrence: external.recurrence,
          },
          clock.now(),
        )
        // Re-tag legacy events with their connection while re-syncing.
        existing.linkToExternal(
          external.externalId,
          external.etag,
          clock.now(),
          connection.id,
        )
        await calendarEvents.save(existing)
        return true
      }

      const created = CalendarEvent.create({
        id: ids.generate(),
        ownerId: owner,
        title: external.title,
        description: external.description,
        location: external.location,
        startsAt: external.startsAt,
        endsAt: external.endsAt,
        allDay: external.allDay,
        recurrence: external.recurrence,
        source: 'google',
        connectionId: connection.id,
        externalId: external.externalId,
        etag: external.etag,
        now: clock.now(),
      })
      created.markSynced(external.etag, clock.now())
      await calendarEvents.save(created)
      return true
    }
  }
}
