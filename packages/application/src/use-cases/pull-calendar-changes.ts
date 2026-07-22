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
import type { JobQueue } from '@/ports/job-queue'
import { MINUTE_MS, REMINDER_JOB } from '@/use-cases/reminder-jobs'

type Dependencies = {
  calendarConnections: CalendarConnectionRepository
  calendarEvents: CalendarEventRepository
  providers: CalendarProviderRegistry
  jobQueue: JobQueue
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
  jobQueue,
  ids,
  clock,
}: Dependencies) {
  // Arm a reminder job for each of the event's offsets whose fire time is still
  // in the future, mirroring create/update-calendar-event. deliverReminder
  // dedups against already-delivered notifications, so re-arming on every sync
  // that applies a change never double-delivers.
  async function armReminders(event: CalendarEvent): Promise<void> {
    const startsAt = event.startsAt.getTime()
    for (const minutesBefore of event.reminders) {
      const fireAt = startsAt - minutesBefore * MINUTE_MS
      if (fireAt > clock.now().getTime()) {
        await jobQueue.enqueue({
          type: REMINDER_JOB,
          payload: {
            eventId: event.id as string,
            userId: event.ownerId as string,
            minutesBefore,
          },
          runAt: new Date(fireAt),
        })
      }
    }
  }

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
      if (connection.needsRefresh(clock.now()) && connection.refreshToken) {
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
              reminders: external.reminders,
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
          // A cancelled instance must not remind; an edited (moved) one should.
          if (!external.cancelledOccurrence) {
            await armReminders(existing)
          }
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
          reminders: external.reminders,
          recurrenceMasterExternalId: external.recurringEventExternalId,
          originalStartsAt: external.originalStartsAt,
          cancelled: external.cancelledOccurrence,
          source: connection.provider,
          connectionId: connection.id,
          externalId: external.externalId,
          etag: external.etag,
          now: clock.now(),
        })
        override.markSynced(external.etag, clock.now())
        await calendarEvents.save(override)
        if (!external.cancelledOccurrence) {
          await armReminders(override)
        }
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
            reminders: external.reminders,
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
        await armReminders(existing)
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
        reminders: external.reminders,
        recurrence: external.recurrence,
        source: connection.provider,
        connectionId: connection.id,
        externalId: external.externalId,
        etag: external.etag,
        now: clock.now(),
      })
      created.markSynced(external.etag, clock.now())
      await calendarEvents.save(created)
      await armReminders(created)
      return true
    }
  }
}
