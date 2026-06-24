import { asEntityId } from '@lifedeck/domain'
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

    const events = await calendarEvents.listByOwnerInRange(
      asEntityId(ownerId),
      fromDate,
      toDate,
    )

    return events.map(toCalendarEventView)
  }
}
