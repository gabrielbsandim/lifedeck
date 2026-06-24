import { CalendarEvent, asEntityId } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { CalendarConnectionRepository } from '@/ports/calendar-connection-repository'
import type { CalendarEventRepository } from '@/ports/calendar-event-repository'
import type {
  CalendarProvider,
  ExternalCalendarEvent,
} from '@/ports/calendar-provider'

type Dependencies = {
  calendarConnections: CalendarConnectionRepository
  calendarEvents: CalendarEventRepository
  provider: CalendarProvider
  ids: IdGenerator
  clock: Clock
}

export type CalendarPullResult = {
  applied: number
}

export function makePullCalendarChanges({
  calendarConnections,
  calendarEvents,
  provider,
  ids,
  clock,
}: Dependencies) {
  return async function pullCalendarChanges(
    ownerId: string,
  ): Promise<CalendarPullResult> {
    const owner = asEntityId(ownerId)
    const connection = await calendarConnections.findByOwner(owner)
    if (!connection) {
      throw new NotFoundError('Calendar connection')
    }

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
    let applied = 0
    for (const external of page.events) {
      if (await applyExternal(external)) {
        applied += 1
      }
    }

    connection.setSyncToken(page.nextSyncToken, clock.now())
    await calendarConnections.save(connection)
    return { applied }

    async function applyExternal(
      external: ExternalCalendarEvent,
    ): Promise<boolean> {
      const existing = await calendarEvents.findByExternalId(
        owner,
        external.externalId,
      )

      if (external.deleted) {
        if (!existing) {
          return false
        }
        await calendarEvents.delete(existing.id)
        return true
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
        existing.markSynced(external.etag, clock.now())
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
