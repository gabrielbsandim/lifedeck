import { describe, expect, it } from 'vitest'
import { CalendarEvent, User, asEntityId } from '@lifedeck/domain'
import {
  isOccurrenceOf,
  nextOccurrenceStart,
  ownerZoneFor,
  upcomingReminderJobs,
} from '@/shared/reminder-schedule'

const NOW = new Date('2026-06-24T10:00:00.000Z')
const OWNER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'

function event(
  overrides: Partial<Parameters<typeof CalendarEvent.create>[0]> = {},
) {
  return CalendarEvent.create({
    id: asEntityId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    ownerId: asEntityId(OWNER_ID),
    title: 'Class',
    startsAt: new Date('2026-06-25T09:00:00.000Z'),
    endsAt: new Date('2026-06-25T10:00:00.000Z'),
    reminders: [30],
    now: NOW,
    ...overrides,
  })
}

describe('reminder schedule', () => {
  it('aims a single event at its own start', () => {
    expect(upcomingReminderJobs(event(), NOW, 'UTC')).toEqual([
      {
        type: 'event-reminder',
        payload: {
          eventId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          userId: OWNER_ID,
          minutesBefore: 30,
        },
        runAt: new Date('2026-06-25T08:30:00.000Z'),
      },
    ])
  })

  it('arms nothing for a past single event or a cancelled one', () => {
    const later = new Date('2026-06-26T00:00:00.000Z')
    expect(upcomingReminderJobs(event(), later, 'UTC')).toEqual([])
    expect(
      upcomingReminderJobs(event({ cancelled: true }), NOW, 'UTC'),
    ).toEqual([])
  })

  it('aims a series at the next occurrence still ahead', () => {
    const series = event({
      startsAt: new Date('2026-01-01T09:00:00.000Z'),
      endsAt: new Date('2026-01-01T10:00:00.000Z'),
      recurrence: { freq: 'daily', interval: 1, startDate: '2026-01-01' },
    })
    const [job] = upcomingReminderJobs(series, NOW, 'UTC')
    expect(job?.payload.occurrenceStart).toBe('2026-06-25T09:00:00.000Z')
    expect(job?.runAt).toEqual(new Date('2026-06-25T08:30:00.000Z'))
  })

  it('tells whether an instant is an occurrence', () => {
    expect(
      isOccurrenceOf(event(), new Date('2026-06-25T09:00:00.000Z'), 'UTC'),
    ).toBe(true)
    expect(
      isOccurrenceOf(event(), new Date('2026-06-26T09:00:00.000Z'), 'UTC'),
    ).toBe(false)
  })

  it('returns the single start only while it is ahead', () => {
    expect(nextOccurrenceStart(event(), NOW, 'UTC')).toEqual(
      new Date('2026-06-25T09:00:00.000Z'),
    )
    expect(
      nextOccurrenceStart(event(), new Date('2026-06-25T09:00:00.000Z'), 'UTC'),
    ).toBeNull()
  })

  it("reads the owner's zone only for a series", async () => {
    const owner = User.createGuest({
      id: asEntityId(OWNER_ID),
      displayName: 'Owner',
      locale: 'pt-BR',
      timezone: 'America/Sao_Paulo',
      createdAt: NOW,
    })
    const users = { findById: async () => owner }
    const series = event({
      recurrence: { freq: 'daily', interval: 1, startDate: '2026-06-25' },
    })
    expect(await ownerZoneFor(users, event())).toBe('UTC')
    expect(await ownerZoneFor(users, series)).toBe('America/Sao_Paulo')
    expect(await ownerZoneFor({ findById: async () => null }, series)).toBe(
      'UTC',
    )
  })
})
