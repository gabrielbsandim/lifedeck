import { describe, expect, it } from 'vitest'
import { ValidationError } from '@/shared/domain-error'
import { asEntityId } from '@/shared/id'
import { CalendarEvent } from '@/entities/calendar-event'

const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const OWNER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'
const NOW = new Date('2026-06-24T10:00:00.000Z')
const STARTS = new Date('2026-06-25T09:00:00.000Z')
const ENDS = new Date('2026-06-25T10:00:00.000Z')

function build(
  overrides: Partial<{
    reminders: number[]
    description: string | null
    endsAt: Date
  }> = {},
): CalendarEvent {
  return CalendarEvent.create({
    id: asEntityId(ID),
    ownerId: asEntityId(OWNER_ID),
    title: 'Dentist',
    description: overrides.description,
    startsAt: STARTS,
    endsAt: overrides.endsAt ?? ENDS,
    reminders: overrides.reminders,
    now: NOW,
  })
}

describe('CalendarEvent', () => {
  it('creates with normalized reminders and timestamps', () => {
    const props = build({ reminders: [30, 10, 30] }).toJSON()
    expect(props.reminders).toEqual([10, 30])
    expect(props.allDay).toBe(false)
    expect(props.createdAt).toEqual(NOW)
    expect(props.updatedAt).toEqual(NOW)
  })

  it('exposes its identity and window', () => {
    const event = build()
    expect(event.id).toBe(ID)
    expect(event.ownerId).toBe(OWNER_ID)
    expect(event.startsAt).toEqual(STARTS)
    expect(event.endsAt).toEqual(ENDS)
    expect(event.isOwnedBy(asEntityId(OWNER_ID))).toBe(true)
    expect(event.isOwnedBy(asEntityId(ID))).toBe(false)
  })

  it('blanks empty optional text', () => {
    expect(build({ description: '   ' }).toJSON().description).toBeNull()
  })

  it('rejects an end before the start', () => {
    expect(() =>
      build({ endsAt: new Date('2026-06-25T08:00:00.000Z') }),
    ).toThrow(ValidationError)
  })

  it('rejects a negative reminder offset', () => {
    expect(() => build({ reminders: [-5] })).toThrow(ValidationError)
  })

  it('rejects more than five reminders', () => {
    expect(() => build({ reminders: [1, 2, 3, 4, 5, 6] })).toThrow(
      ValidationError,
    )
  })

  it('updates fields and the updated timestamp', () => {
    const event = build()
    const later = new Date('2026-06-24T12:00:00.000Z')
    event.update(
      { title: 'Dentist appointment', reminders: [15], allDay: true },
      later,
    )
    const props = event.toJSON()
    expect(props.title).toBe('Dentist appointment')
    expect(props.reminders).toEqual([15])
    expect(props.allDay).toBe(true)
    expect(props.updatedAt).toEqual(later)
  })

  it('rejects an update that inverts the window', () => {
    const event = build()
    expect(() =>
      event.update({ endsAt: new Date('2026-06-25T08:00:00.000Z') }, NOW),
    ).toThrow(ValidationError)
  })

  it('clears recurrence when updated with null', () => {
    const event = CalendarEvent.create({
      id: asEntityId(ID),
      ownerId: asEntityId(OWNER_ID),
      title: 'Standup',
      startsAt: STARTS,
      endsAt: ENDS,
      recurrence: {
        freq: 'weekly',
        interval: 1,
        startDate: '2026-06-25',
      },
      now: NOW,
    })
    expect(event.toJSON().recurrence).not.toBeNull()
    event.update({ recurrence: null }, NOW)
    expect(event.toJSON().recurrence).toBeNull()
  })

  it('defaults to a local source with no external link', () => {
    const event = build()
    expect(event.source).toBe('local')
    expect(event.externalId).toBeNull()
    expect(event.etag).toBeNull()
    expect(event.connectionId).toBeNull()
  })

  it('links to and re-syncs an external event', () => {
    const event = build()
    const syncedAt = new Date('2026-06-24T11:00:00.000Z')
    event.linkToExternal(
      'google-evt-1',
      'etag-1',
      syncedAt,
      asEntityId('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
    )
    expect(event.externalId).toBe('google-evt-1')
    expect(event.etag).toBe('etag-1')
    expect(event.connectionId).toBe('cccccccc-cccc-4ccc-8ccc-cccccccccccc')
    expect(event.toJSON().syncedAt).toEqual(syncedAt)

    const later = new Date('2026-06-24T12:00:00.000Z')
    event.markSynced('etag-2', later)
    expect(event.etag).toBe('etag-2')
    expect(event.toJSON().syncedAt).toEqual(later)
  })

  it('adopts an external source and id on creation', () => {
    const event = CalendarEvent.create({
      id: asEntityId(ID),
      ownerId: asEntityId(OWNER_ID),
      title: 'From Google',
      startsAt: STARTS,
      endsAt: ENDS,
      source: 'google',
      externalId: 'google-evt-2',
      etag: 'etag-9',
      now: NOW,
    })
    expect(event.source).toBe('google')
    expect(event.externalId).toBe('google-evt-2')
    expect(event.updatedAt).toEqual(NOW)
  })

  it('restores from persisted props', () => {
    const event = build({ reminders: [10] })
    expect(CalendarEvent.restore(event.toJSON()).toJSON()).toEqual(
      event.toJSON(),
    )
  })

  it('exposes its detail getters', () => {
    const event = CalendarEvent.create({
      id: asEntityId(ID),
      ownerId: asEntityId(OWNER_ID),
      title: 'Lunch',
      description: 'With Sam',
      location: 'Cafe',
      startsAt: STARTS,
      endsAt: ENDS,
      allDay: true,
      now: NOW,
    })
    expect(event.title).toBe('Lunch')
    expect(event.description).toBe('With Sam')
    expect(event.location).toBe('Cafe')
    expect(event.allDay).toBe(true)
    expect(event.recurrence).toBeNull()
  })

  it('defaults occurrence-override fields to empty', () => {
    const props = build().toJSON()
    expect(props.recurrenceMasterExternalId).toBeNull()
    expect(props.originalStartsAt).toBeNull()
    expect(props.cancelled).toBe(false)
  })

  it('creates an occurrence override tied to a series', () => {
    const original = new Date('2026-07-15T18:00:00.000Z')
    const event = CalendarEvent.create({
      id: asEntityId(ID),
      ownerId: asEntityId(OWNER_ID),
      title: 'English Class (moved)',
      startsAt: new Date('2026-07-15T19:00:00.000Z'),
      endsAt: new Date('2026-07-15T19:50:00.000Z'),
      source: 'google',
      recurrenceMasterExternalId: 'master-1',
      originalStartsAt: original,
      now: NOW,
    })
    expect(event.recurrenceMasterExternalId).toBe('master-1')
    expect(event.originalStartsAt).toEqual(original)
    expect(event.cancelled).toBe(false)
  })

  it('marks an occurrence cancelled through update', () => {
    const event = build()
    event.update({ cancelled: true }, new Date('2026-06-26T10:00:00.000Z'))
    expect(event.cancelled).toBe(true)
    expect(event.updatedAt).toEqual(new Date('2026-06-26T10:00:00.000Z'))
  })

  it('exposes its recurrence rule', () => {
    const event = CalendarEvent.create({
      id: asEntityId(ID),
      ownerId: asEntityId(OWNER_ID),
      title: 'Weekly',
      startsAt: STARTS,
      endsAt: ENDS,
      recurrence: {
        freq: 'weekly',
        interval: 1,
        byWeekday: [3],
        startDate: '2026-06-25',
      },
      now: NOW,
    })
    expect(event.recurrence?.freq).toBe('weekly')
  })
})
