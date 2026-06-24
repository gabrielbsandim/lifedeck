import {
  CalendarEvent,
  asEntityId,
  type RecurrenceRule,
} from '@lifedeck/domain'

export type CalendarEventRecord = {
  id: string
  ownerId: string
  title: string
  description: string | null
  location: string | null
  startsAt: Date
  endsAt: Date
  allDay: boolean
  reminders: number[]
  recurrence: RecurrenceRule | null
  createdAt: Date
  updatedAt: Date
}

export function toDomainCalendarEvent(
  record: CalendarEventRecord,
): CalendarEvent {
  return CalendarEvent.restore({
    id: asEntityId(record.id),
    ownerId: asEntityId(record.ownerId),
    title: record.title,
    description: record.description,
    location: record.location,
    startsAt: record.startsAt,
    endsAt: record.endsAt,
    allDay: record.allDay,
    reminders: record.reminders,
    recurrence: record.recurrence,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  })
}

export function toCalendarEventRecord(
  event: CalendarEvent,
): CalendarEventRecord {
  const props = event.toJSON()
  return {
    id: props.id,
    ownerId: props.ownerId,
    title: props.title,
    description: props.description,
    location: props.location,
    startsAt: props.startsAt,
    endsAt: props.endsAt,
    allDay: props.allDay,
    reminders: props.reminders,
    recurrence: props.recurrence,
    createdAt: props.createdAt,
    updatedAt: props.updatedAt,
  }
}
