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
import type { Logger } from '@/ports/logger'
import { makeEnsureFreshCalendarToken } from '@/shared/fresh-calendar-token'
import type { UserRepository } from '@/ports/user-repository'
import { ownerZoneFor, upcomingReminderJobs } from '@/shared/reminder-schedule'
import type { BookingCalendarSync } from '@/shared/booking-calendar-sync'

type Dependencies = {
  calendarConnections: CalendarConnectionRepository
  calendarEvents: CalendarEventRepository
  providers: CalendarProviderRegistry
  jobQueue: JobQueue
  users: Pick<UserRepository, 'findById'>
  ids: IdGenerator
  clock: Clock
  logger?: Logger
  bookingSync?: BookingCalendarSync
}

export type CalendarPullResult = {
  applied: number
  failed: number
}

export function makePullCalendarChanges({
  calendarConnections,
  calendarEvents,
  providers,
  jobQueue,
  users,
  ids,
  clock,
  logger,
  bookingSync,
}: Dependencies) {
  const ensureFreshToken = makeEnsureFreshCalendarToken({
    calendarConnections,
    clock,
  })

  // deliverReminder dedups per occurrence, so re-arming on every sync that
  // applies a change never double-delivers.
  async function armReminders(event: CalendarEvent): Promise<void> {
    const ownerZone = await ownerZoneFor(users, event)
    for (const job of upcomingReminderJobs(event, clock.now(), ownerZone)) {
      await jobQueue.enqueue(job)
    }
  }

  return async function pullCalendarChanges(
    ownerId: string,
    options: { force?: boolean } = {},
  ): Promise<CalendarPullResult> {
    // A forced pull ignores the stored sync cursor (so every event comes back,
    // not just recent deltas) and re-applies reminder offsets even to events
    // that have not otherwise changed. Used to backfill reminders onto events
    // that synced before reminder capture existed, on reconnect and on demand.
    const force = options.force === true
    const owner = asEntityId(ownerId)
    const connections = await calendarConnections.listByOwner(owner)
    if (connections.length === 0) {
      throw new NotFoundError('Calendar connection')
    }

    let applied = 0
    let failed = 0
    for (const connection of connections) {
      try {
        applied += await pullConnection(connection)
      } catch (error) {
        // One connection failing (e.g. a revoked grant) must not block the
        // user's other calendars; the caller decides whether to retry.
        failed += 1
        logger?.warn('calendar_pull_failed', {
          connectionId: connection.id as string,
          provider: connection.provider,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
    return { applied, failed }

    async function pullConnection(
      connection: CalendarConnection,
    ): Promise<number> {
      const provider = providers.get(connection.provider)
      await ensureFreshToken(connection, provider)

      // Drop the cursor so the provider returns a full window, not just deltas.
      if (force) {
        connection.setSyncToken(null, clock.now())
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
          const isNewer =
            external.updatedAt.getTime() > existing.updatedAt.getTime()
          if (!isNewer && !force) {
            return false
          }
          if (isNewer) {
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
                busy: external.busy,
              },
              clock.now(),
            )
            existing.linkToExternal(
              external.externalId,
              external.etag,
              clock.now(),
              connection.id,
            )
          } else {
            // Forced backfill of an unchanged event: refresh only what the
            // remote side owns (reminders, free/busy), never local content.
            existing.update(
              { reminders: external.reminders, busy: external.busy },
              clock.now(),
            )
          }
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
          busy: external.busy,
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
          await bookingSync?.eventDeleted(existing.id)
          await calendarEvents.delete(existing.id)
          return true
        }
        return false
      }

      if (existing) {
        // Last-writer-wins: only adopt the remote change when it is newer
        // than what we hold locally. A forced backfill still runs, but only to
        // refresh reminder offsets, never to overwrite newer local content.
        const isNewer =
          external.updatedAt.getTime() > existing.updatedAt.getTime()
        if (!isNewer && !force) {
          return false
        }
        if (isNewer) {
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
              busy: external.busy,
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
        } else {
          existing.update(
            { reminders: external.reminders, busy: external.busy },
            clock.now(),
          )
        }
        existing.setConferenceUrl(external.conferenceUrl)
        await calendarEvents.save(existing)
        await armReminders(existing)
        if (isNewer) {
          await bookingSync?.eventMoved(
            existing.id,
            existing.startsAt,
            existing.endsAt,
          )
        }
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
        busy: external.busy,
        conferenceUrl: external.conferenceUrl,
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
