import {
  asEntityId,
  occurrencesBetween,
  type CalendarEvent,
} from '@lifedeck/domain'
import {
  listCalendarEventsQuerySchema,
  type CalendarEventView,
  type ListCalendarEventsQuery,
} from '@/dtos/calendar-event-dto'
import { toCalendarEventView } from '@/mappers/calendar-event-mapper'
import { ValidationError } from '@lifedeck/domain'
import type { CalendarEventRepository } from '@/ports/calendar-event-repository'

type Dependencies = {
  calendarEvents: CalendarEventRepository
}

function utcMidnightMs(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function overrideKey(
  masterExternalId: string,
  originalStartMs: number,
): string {
  return `${masterExternalId}|${originalStartMs}`
}

// A concrete occurrence of a recurring series, ready for the calendar UI. It
// borrows the master's details but carries the occurrence's own window and a
// stable link back to the series (`seriesId`) and its slot (`occurrenceStart`).
function virtualOccurrenceView(
  master: CalendarEvent,
  startsAt: Date,
  endsAt: Date,
): CalendarEventView {
  return {
    ...toCalendarEventView(master),
    id: `${master.id as string}::${startsAt.toISOString()}`,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    recurrence: null,
    recurring: true,
    seriesId: master.id as string,
    occurrenceStart: startsAt.toISOString(),
    externalId: null,
  }
}

// An occurrence that was edited (a stored override row). Keeps the override's
// own title/window while linking back to its series master.
function overrideOccurrenceView(
  override: CalendarEvent,
  master: CalendarEvent | null,
): CalendarEventView {
  return {
    ...toCalendarEventView(override),
    recurrence: null,
    recurring: true,
    seriesId: master ? (master.id as string) : null,
  }
}

export function makeListCalendarEvents({ calendarEvents }: Dependencies) {
  return async function listCalendarEvents(
    ownerId: string,
    query: ListCalendarEventsQuery,
  ): Promise<CalendarEventView[]> {
    const { from, to } = listCalendarEventsQuerySchema.parse(query)
    const fromDate = new Date(from)
    const toDate = new Date(to)
    if (toDate.getTime() < fromDate.getTime()) {
      throw new ValidationError('Range end must not be before its start.')
    }

    const owner = asEntityId(ownerId)
    const singles = await calendarEvents.listByOwnerInRange(
      owner,
      fromDate,
      toDate,
    )
    const masters = await calendarEvents.listRecurringMasters(owner)
    const masterExternalIds = masters
      .map(master => master.externalId)
      .filter((id): id is string => id !== null)
    const overrides = await calendarEvents.listOverridesByMasterExternalIds(
      owner,
      masterExternalIds,
    )

    const overrideByKey = new Map<string, CalendarEvent>()
    for (const override of overrides) {
      const masterExternalId = override.recurrenceMasterExternalId
      const originalStartsAt = override.originalStartsAt
      if (masterExternalId && originalStartsAt) {
        overrideByKey.set(
          overrideKey(masterExternalId, originalStartsAt.getTime()),
          override,
        )
      }
    }

    const views: CalendarEventView[] = singles.map(toCalendarEventView)
    const usedOverrideIds = new Set<string>()

    for (const master of masters) {
      const rule = master.recurrence
      if (!rule) {
        continue
      }
      const props = master.toJSON()
      const duration = props.endsAt.getTime() - props.startsAt.getTime()
      const timeOfDay = props.startsAt.getTime() - utcMidnightMs(props.startsAt)

      for (const day of occurrencesBetween(rule, fromDate, toDate)) {
        const startsAt = new Date(day.getTime() + timeOfDay)
        const key = master.externalId
          ? overrideKey(master.externalId, startsAt.getTime())
          : null
        const override = key ? overrideByKey.get(key) : undefined
        if (override) {
          usedOverrideIds.add(override.id as string)
          if (override.cancelled) {
            continue
          }
          views.push(overrideOccurrenceView(override, master))
          continue
        }
        views.push(
          virtualOccurrenceView(
            master,
            startsAt,
            new Date(startsAt.getTime() + duration),
          ),
        )
      }
    }

    // An override whose new window lands in range but whose original slot fell
    // outside it (a class moved into this month) still belongs here.
    for (const override of overrides) {
      if (usedOverrideIds.has(override.id as string) || override.cancelled) {
        continue
      }
      const props = override.toJSON()
      if (
        props.startsAt.getTime() <= toDate.getTime() &&
        props.endsAt.getTime() >= fromDate.getTime()
      ) {
        const master =
          masters.find(
            candidate =>
              candidate.externalId === override.recurrenceMasterExternalId,
          ) ?? null
        views.push(overrideOccurrenceView(override, master))
      }
    }

    return views.sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )
  }
}
