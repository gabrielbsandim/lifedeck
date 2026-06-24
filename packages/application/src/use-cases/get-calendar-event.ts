import { asEntityId } from '@lifedeck/domain'
import { type CalendarEventView } from '@/dtos/calendar-event-dto'
import { toCalendarEventView } from '@/mappers/calendar-event-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import type { CalendarEventRepository } from '@/ports/calendar-event-repository'

type Dependencies = {
  calendarEvents: CalendarEventRepository
}

export function makeGetCalendarEvent({ calendarEvents }: Dependencies) {
  return async function getCalendarEvent(
    ownerId: string,
    id: string,
  ): Promise<CalendarEventView> {
    const event = await calendarEvents.findById(asEntityId(id))
    if (!event || !event.isOwnedBy(asEntityId(ownerId))) {
      throw new NotFoundError('Calendar event')
    }
    return toCalendarEventView(event)
  }
}
