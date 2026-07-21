import { describe, expect, it } from 'vitest'
import { buildCalendar, parseCalendarEvents } from '@/calendar/ical'

const wrap = (vevent: string): string =>
  `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${vevent}\r\nEND:VCALENDAR`

describe('parseCalendarEvents', () => {
  it('parses a timed event with all its fields', () => {
    const ics = wrap(
      [
        'BEGIN:VEVENT',
        'UID:evt-1@icloud.com',
        'SUMMARY:Lunch with Ana',
        'DESCRIPTION:Discuss the\\nroadmap',
        'LOCATION:Cafe\\, downtown',
        'DTSTART:20260720T150000Z',
        'DTEND:20260720T160000Z',
        'LAST-MODIFIED:20260719T100000Z',
        'END:VEVENT',
      ].join('\r\n'),
    )
    const [event] = parseCalendarEvents(ics)
    expect(event).toMatchObject({
      uid: 'evt-1@icloud.com',
      summary: 'Lunch with Ana',
      description: 'Discuss the\nroadmap',
      location: 'Cafe, downtown',
      allDay: false,
      recurrence: null,
      recurrenceId: null,
      cancelled: false,
    })
    expect(event!.startsAt.toISOString()).toBe('2026-07-20T15:00:00.000Z')
    expect(event!.endsAt.toISOString()).toBe('2026-07-20T16:00:00.000Z')
    expect(event!.updatedAt.toISOString()).toBe('2026-07-19T10:00:00.000Z')
  })

  it('parses an all-day event', () => {
    const [event] = parseCalendarEvents(
      wrap(
        'BEGIN:VEVENT\r\nUID:d1\r\nSUMMARY:Holiday\r\nDTSTART;VALUE=DATE:20260720\r\nDTEND;VALUE=DATE:20260721\r\nEND:VEVENT',
      ),
    )
    expect(event!.allDay).toBe(true)
    expect(event!.startsAt.toISOString()).toBe('2026-07-20T00:00:00.000Z')
  })

  it('reads a recurring master and an occurrence override', () => {
    const [event] = parseCalendarEvents(
      wrap(
        'BEGIN:VEVENT\r\nUID:r1\r\nSUMMARY:Standup\r\nDTSTART:20260720T090000Z\r\nDTEND:20260720T091500Z\r\nRRULE:FREQ=WEEKLY;BYDAY=MO\r\nEND:VEVENT',
      ),
    )
    expect(event!.recurrence).toMatchObject({ freq: 'weekly' })
    expect(event!.recurrenceId).toBeNull()

    const [override] = parseCalendarEvents(
      wrap(
        'BEGIN:VEVENT\r\nUID:r1\r\nSUMMARY:Standup moved\r\nRECURRENCE-ID:20260727T090000Z\r\nDTSTART:20260727T100000Z\r\nDTEND:20260727T101500Z\r\nEND:VEVENT',
      ),
    )
    expect(override!.recurrence).toBeNull()
    expect(override!.recurrenceId?.toISOString()).toBe(
      '2026-07-27T09:00:00.000Z',
    )
  })

  it('resolves a TZID-qualified DATE-TIME to the right absolute instant', () => {
    const [event] = parseCalendarEvents(
      wrap(
        'BEGIN:VEVENT\r\nUID:tz1\r\nSUMMARY:SP meeting\r\nDTSTART;TZID=America/Sao_Paulo:20260720T090000\r\nDTEND;TZID=America/Sao_Paulo:20260720T100000\r\nEND:VEVENT',
      ),
    )
    // 09:00 in Sao Paulo (UTC-3) is 12:00 UTC.
    expect(event!.startsAt.toISOString()).toBe('2026-07-20T12:00:00.000Z')
    expect(event!.endsAt.toISOString()).toBe('2026-07-20T13:00:00.000Z')
    expect(event!.allDay).toBe(false)
  })

  it('falls back to UTC for a non-IANA TZID', () => {
    const [event] = parseCalendarEvents(
      wrap(
        'BEGIN:VEVENT\r\nUID:tz2\r\nSUMMARY:Custom\r\nDTSTART;TZID=Custom/Made-Up:20260720T090000\r\nEND:VEVENT',
      ),
    )
    expect(event!.startsAt.toISOString()).toBe('2026-07-20T09:00:00.000Z')
  })

  it('reads a floating DATE-TIME (no Z, no TZID) as UTC', () => {
    const [event] = parseCalendarEvents(
      wrap(
        'BEGIN:VEVENT\r\nUID:fl1\r\nSUMMARY:Floating\r\nDTSTART:20260720T090000\r\nEND:VEVENT',
      ),
    )
    expect(event!.startsAt.toISOString()).toBe('2026-07-20T09:00:00.000Z')
  })

  it('falls back for a non-compact date and a missing DTEND', () => {
    const [event] = parseCalendarEvents(
      wrap(
        'BEGIN:VEVENT\r\nUID:f1\r\nSUMMARY:Odd\r\nDTSTART:2026-07-20T15:00:00Z\r\nEND:VEVENT',
      ),
    )
    // The dashed/colon ISO value does not match the compact form; parsed via Date.
    expect(event!.startsAt.toISOString()).toBe('2026-07-20T15:00:00.000Z')
    // With no DTEND, the end mirrors the start.
    expect(event!.endsAt.toISOString()).toBe('2026-07-20T15:00:00.000Z')
  })

  it('defaults an untitled event and tolerates valueless parameters', () => {
    const [event] = parseCalendarEvents(
      wrap(
        'BEGIN:VEVENT\r\nUID:u1\r\nDTSTART;FOO:20260720T150000Z\r\nDTEND:20260720T160000Z\r\nEND:VEVENT',
      ),
    )
    expect(event!.summary).toBe('(no title)')
    expect(event!.startsAt.toISOString()).toBe('2026-07-20T15:00:00.000Z')
  })

  it('skips malformed lines and defaults a missing DTSTART', () => {
    const [event] = parseCalendarEvents(
      wrap(
        'BEGIN:VEVENT\r\nUID:m1\r\nGARBAGE-NO-COLON\r\nSUMMARY:No start\r\nEND:VEVENT',
      ),
    )
    expect(event!.summary).toBe('No start')
    expect(event!.startsAt.toISOString()).toBe('1970-01-01T00:00:00.000Z')
  })

  it('treats a bare 8-digit DTSTART as an all-day date', () => {
    const [event] = parseCalendarEvents(
      wrap(
        'BEGIN:VEVENT\r\nUID:b1\r\nSUMMARY:Day\r\nDTSTART:20260720\r\nEND:VEVENT',
      ),
    )
    expect(event!.allDay).toBe(true)
    expect(event!.startsAt.toISOString()).toBe('2026-07-20T00:00:00.000Z')
  })

  it('flags a cancelled event and unfolds wrapped lines', () => {
    const [event] = parseCalendarEvents(
      wrap(
        'BEGIN:VEVENT\r\nUID:c1\r\nSUMMARY:A very long title that spills\r\n  over one folded line\r\nDTSTART:20260720T150000Z\r\nDTEND:20260720T160000Z\r\nSTATUS:CANCELLED\r\nEND:VEVENT',
      ),
    )
    expect(event!.summary).toBe(
      'A very long title that spills over one folded line',
    )
    expect(event!.cancelled).toBe(true)
  })
})

describe('buildCalendar', () => {
  const dtstamp = new Date('2026-07-19T10:00:00.000Z')

  it('emits a timed VEVENT with escaped text', () => {
    const ics = buildCalendar({
      uid: 'evt-1',
      summary: 'Lunch; with Ana',
      description: 'line1\nline2',
      location: null,
      startsAt: new Date('2026-07-20T15:00:00.000Z'),
      endsAt: new Date('2026-07-20T16:00:00.000Z'),
      allDay: false,
      recurrence: null,
      dtstamp,
    })
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('UID:evt-1')
    expect(ics).toContain('DTSTART:20260720T150000Z')
    expect(ics).toContain('SUMMARY:Lunch\\; with Ana')
    expect(ics).toContain('DESCRIPTION:line1\\nline2')
  })

  it('emits an all-day VEVENT and round-trips through the parser', () => {
    const ics = buildCalendar({
      uid: 'day-1',
      summary: 'Holiday',
      description: null,
      location: null,
      startsAt: new Date('2026-07-20T00:00:00.000Z'),
      endsAt: new Date('2026-07-21T00:00:00.000Z'),
      allDay: true,
      recurrence: null,
      dtstamp,
    })
    expect(ics).toContain('DTSTART;VALUE=DATE:20260720')
    const [parsed] = parseCalendarEvents(ics)
    expect(parsed).toMatchObject({
      uid: 'day-1',
      summary: 'Holiday',
      allDay: true,
    })
  })

  it('folds a content line longer than 75 octets', () => {
    const ics = buildCalendar({
      uid: 'long-1',
      summary: 'x'.repeat(200),
      description: null,
      location: null,
      startsAt: new Date('2026-07-20T15:00:00.000Z'),
      endsAt: new Date('2026-07-20T16:00:00.000Z'),
      allDay: false,
      recurrence: null,
      dtstamp,
    })
    // A folded continuation line begins with a single space.
    expect(ics.split('\r\n').some(line => line.startsWith(' '))).toBe(true)
    // And it still round-trips to the full summary.
    const [parsed] = parseCalendarEvents(ics)
    expect(parsed!.summary).toBe('x'.repeat(200))
  })

  it('folds a multibyte line without splitting a character', () => {
    const summary = '😀'.repeat(40) // 4 octets each = 160 octets
    const ics = buildCalendar({
      uid: 'emoji-1',
      summary,
      description: null,
      location: null,
      startsAt: new Date('2026-07-20T15:00:00.000Z'),
      endsAt: new Date('2026-07-20T16:00:00.000Z'),
      allDay: false,
      recurrence: null,
      dtstamp,
    })
    // No character was cut into lone surrogates (no replacement char), and every
    // physical line stays within the 75-octet limit.
    expect(ics).not.toContain('�')
    for (const line of ics.split('\r\n')) {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75)
    }
    expect(parseCalendarEvents(ics)[0]!.summary).toBe(summary)
  })

  it('escapes carriage returns in text and round-trips a LOCATION', () => {
    const ics = buildCalendar({
      uid: 'loc-1',
      summary: 'A\r\nB',
      description: 'x\ry',
      location: 'Room 5; floor 2',
      startsAt: new Date('2026-07-20T15:00:00.000Z'),
      endsAt: new Date('2026-07-20T16:00:00.000Z'),
      allDay: false,
      recurrence: null,
      dtstamp,
    })
    expect(ics).toContain('SUMMARY:A\\nB')
    expect(ics).toContain('DESCRIPTION:x\\ny')
    expect(ics).toContain('LOCATION:Room 5\\; floor 2')
    expect(parseCalendarEvents(ics)[0]!.location).toBe('Room 5; floor 2')
  })

  it('emits a DATE (not DATE-TIME) UNTIL for an all-day recurring event', () => {
    const ics = buildCalendar({
      uid: 'ad-1',
      summary: 'Daily standup',
      description: null,
      location: null,
      startsAt: new Date('2026-07-20T00:00:00.000Z'),
      endsAt: new Date('2026-07-21T00:00:00.000Z'),
      allDay: true,
      recurrence: {
        freq: 'daily',
        interval: 1,
        startDate: '2026-07-20',
        until: '2026-07-30',
      },
      dtstamp,
    })
    expect(ics).toContain('UNTIL=20260730')
    expect(ics).not.toMatch(/UNTIL=\d{8}T/)
  })

  it('includes an RRULE for a recurring event', () => {
    const ics = buildCalendar({
      uid: 'r1',
      summary: 'Standup',
      description: null,
      location: null,
      startsAt: new Date('2026-07-20T09:00:00.000Z'),
      endsAt: new Date('2026-07-20T09:15:00.000Z'),
      allDay: false,
      recurrence: {
        freq: 'weekly',
        interval: 1,
        byWeekday: [1],
        startDate: '2026-07-20',
      },
      dtstamp,
    })
    expect(ics).toMatch(/RRULE:FREQ=WEEKLY/)
  })
})
