import type { CalendarEvent } from '@lifedeck/domain'
import type { CalendarEventView } from '@/dtos/calendar-event-dto'

export function toCalendarEventView(event: CalendarEvent): CalendarEventView {
  const props = event.toJSON()
  return {
    id: props.id,
    ownerId: props.ownerId,
    title: props.title,
    description: props.description,
    location: props.location,
    startsAt: props.startsAt.toISOString(),
    endsAt: props.endsAt.toISOString(),
    allDay: props.allDay,
    reminders: props.reminders,
    recurrence: props.recurrence,
    recurring:
      props.recurrence !== null || props.recurrenceMasterExternalId !== null,
    seriesId: null,
    occurrenceStart: props.originalStartsAt
      ? props.originalStartsAt.toISOString()
      : null,
    source: props.source,
    externalId: props.externalId,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  }
}
