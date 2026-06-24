import { CalendarEvent, asEntityId } from '@lifedeck/domain'
import {
  createCalendarEventSchema,
  type CalendarEventView,
  type CreateCalendarEventInput,
} from '@/dtos/calendar-event-dto'
import { toCalendarEventView } from '@/mappers/calendar-event-mapper'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { CalendarEventRepository } from '@/ports/calendar-event-repository'

type Dependencies = {
  calendarEvents: CalendarEventRepository
  ids: IdGenerator
  clock: Clock
}

export function makeCreateCalendarEvent({
  calendarEvents,
  ids,
  clock,
}: Dependencies) {
  return async function createCalendarEvent(
    ownerId: string,
    input: CreateCalendarEventInput,
  ): Promise<CalendarEventView> {
    const data = createCalendarEventSchema.parse(input)

    const event = CalendarEvent.create({
      id: ids.generate(),
      ownerId: asEntityId(ownerId),
      title: data.title,
      description: data.description,
      location: data.location,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
      allDay: data.allDay,
      reminders: data.reminders,
      recurrence: data.recurrence ?? null,
      now: clock.now(),
    })

    await calendarEvents.save(event)

    return toCalendarEventView(event)
  }
}
