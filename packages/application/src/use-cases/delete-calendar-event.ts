import { asEntityId } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import type { CalendarEventRepository } from '@/ports/calendar-event-repository'

type Dependencies = {
  calendarEvents: CalendarEventRepository
}

export function makeDeleteCalendarEvent({ calendarEvents }: Dependencies) {
  return async function deleteCalendarEvent(
    ownerId: string,
    id: string,
  ): Promise<void> {
    const event = await calendarEvents.findById(asEntityId(id))
    if (!event || !event.isOwnedBy(asEntityId(ownerId))) {
      throw new NotFoundError('Calendar event')
    }
    await calendarEvents.delete(asEntityId(id))
  }
}
