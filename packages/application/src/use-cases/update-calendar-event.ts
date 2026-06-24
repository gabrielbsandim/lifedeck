import { asEntityId } from '@lifedeck/domain'
import {
  updateCalendarEventSchema,
  type CalendarEventView,
  type UpdateCalendarEventInput,
} from '@/dtos/calendar-event-dto'
import { toCalendarEventView } from '@/mappers/calendar-event-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { CalendarEventRepository } from '@/ports/calendar-event-repository'

type Dependencies = {
  calendarEvents: CalendarEventRepository
  clock: Clock
}

export function makeUpdateCalendarEvent({
  calendarEvents,
  clock,
}: Dependencies) {
  return async function updateCalendarEvent(
    ownerId: string,
    id: string,
    input: UpdateCalendarEventInput,
  ): Promise<CalendarEventView> {
    const data = updateCalendarEventSchema.parse(input)

    const event = await calendarEvents.findById(asEntityId(id))
    if (!event || !event.isOwnedBy(asEntityId(ownerId))) {
      throw new NotFoundError('Calendar event')
    }

    event.update(
      {
        title: data.title,
        description: data.description,
        location: data.location,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
        allDay: data.allDay,
        reminders: data.reminders,
        recurrence: data.recurrence,
      },
      clock.now(),
    )

    await calendarEvents.save(event)

    return toCalendarEventView(event)
  }
}
