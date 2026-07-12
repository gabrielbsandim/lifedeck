import { describe, expect, it } from 'vitest'
import { CalendarEvent, asEntityId } from '@lifedeck/domain'
import {
  toCalendarEventRecord,
  toDomainCalendarEvent,
  type CalendarEventRecord,
} from '@/database/calendar-event-record'

const RECORD: CalendarEventRecord = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  ownerId: 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb',
  title: 'Dentist',
  description: null,
  location: null,
  startsAt: new Date('2026-06-25T09:00:00.000Z'),
  endsAt: new Date('2026-06-25T10:00:00.000Z'),
  allDay: false,
  reminders: [10, 30],
  recurrence: null,
  source: 'local',
  connectionId: null,
  externalId: null,
  etag: null,
  syncedAt: null,
  createdAt: new Date('2026-06-24T10:00:00.000Z'),
  updatedAt: new Date('2026-06-24T10:00:00.000Z'),
}

describe('calendar-event-record', () => {
  it('maps a record to a domain event', () => {
    const event = toDomainCalendarEvent(RECORD)
    expect(event.id).toBe(RECORD.id)
    expect(event.reminders).toEqual([10, 30])
  })

  it('maps a domain event back to a record', () => {
    const event = CalendarEvent.restore({
      id: asEntityId(RECORD.id),
      ownerId: asEntityId(RECORD.ownerId),
      title: RECORD.title,
      description: RECORD.description,
      location: RECORD.location,
      startsAt: RECORD.startsAt,
      endsAt: RECORD.endsAt,
      allDay: RECORD.allDay,
      reminders: RECORD.reminders,
      recurrence: RECORD.recurrence,
      source: RECORD.source,
      connectionId: RECORD.connectionId
        ? asEntityId(RECORD.connectionId)
        : null,
      externalId: RECORD.externalId,
      etag: RECORD.etag,
      syncedAt: RECORD.syncedAt,
      createdAt: RECORD.createdAt,
      updatedAt: RECORD.updatedAt,
    })
    expect(toCalendarEventRecord(event)).toEqual(RECORD)
  })
})
