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

  it('restores from persisted props', () => {
    const event = build({ reminders: [10] })
    expect(CalendarEvent.restore(event.toJSON()).toJSON()).toEqual(
      event.toJSON(),
    )
  })
})
