import { isTimeZone, zonedWallTimeToInstant } from '@lifedeck/domain'
import type { RecurrenceRule } from '@lifedeck/domain'
import { fromGoogleRecurrence, toGoogleRecurrence } from '@/calendar/rrule'

// A minimal RFC 5545 (iCalendar) reader/writer for the Apple CalDAV adapter.
// It covers the fields life-deck syncs (UID, SUMMARY, DESCRIPTION, LOCATION,
// DTSTART/DTEND, RRULE, RECURRENCE-ID, STATUS, LAST-MODIFIED) for the common
// cases. A DATE-TIME is resolved to an absolute instant from its "Z" (UTC) or
// its `TZID` (an IANA zone name, which iCloud uses). Known limitation: a TZID
// that names a custom VTIMEZONE (not an IANA zone) or a floating time with no
// zone is read as UTC, since no VTIMEZONE table is parsed.

export type ParsedEvent = {
  uid: string | null
  summary: string
  description: string | null
  location: string | null
  startsAt: Date
  endsAt: Date
  allDay: boolean
  recurrence: RecurrenceRule | null
  // Set when this VEVENT is an override of one occurrence of a series.
  recurrenceId: Date | null
  updatedAt: Date
  cancelled: boolean
}

type Prop = { name: string; params: Record<string, string>; value: string }

// RFC 5545 line unfolding: a line beginning with a space or tab continues the
// previous one.
function unfold(ics: string): string[] {
  const normalized = ics.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines: string[] = []
  for (const line of normalized.split('\n')) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1)
    } else {
      lines.push(line)
    }
  }
  return lines
}

function unescapeText(value: string): string {
  return value
    .replace(/\\[nN]/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function parseProp(line: string): Prop | null {
  const colon = line.indexOf(':')
  if (colon === -1) {
    return null
  }
  const head = line.slice(0, colon)
  const value = line.slice(colon + 1)
  const [name, ...paramParts] = head.split(';')
  const params: Record<string, string> = {}
  for (const part of paramParts) {
    const eq = part.indexOf('=')
    if (eq !== -1) {
      params[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1)
    }
  }
  return { name: (name ?? '').toUpperCase(), params, value }
}

function parseDate(prop: Prop): { date: Date; allDay: boolean } {
  const value = prop.value.trim()
  if (prop.params.VALUE === 'DATE' || /^\d{8}$/.test(value)) {
    const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
    return { date: new Date(`${iso}T00:00:00.000Z`), allDay: true }
  }
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/)
  if (!match) {
    return { date: new Date(value), allDay: false }
  }
  const [, y, mo, d, h, mi, s, z] = match
  const isoDate = `${y}-${mo}-${d}`
  const tzid = prop.params.TZID
  // A trailing "Z" is UTC; a TZID names the zone the wall clock is in. Resolve
  // an IANA-named TZID to an absolute instant so iCloud's local times land
  // right; a floating time (no "Z", no resolvable TZID) falls back to UTC.
  if (!z && tzid && isTimeZone(tzid)) {
    return {
      date: zonedWallTimeToInstant(isoDate, +h!, +mi!, +s!, tzid),
      allDay: false,
    }
  }
  return {
    date: new Date(`${isoDate}T${h}:${mi}:${s}.000Z`),
    allDay: false,
  }
}

function buildEvent(props: Prop[]): ParsedEvent {
  const get = (name: string): Prop | undefined =>
    props.find(prop => prop.name === name)
  const dtstart = get('DTSTART')
  const start = dtstart
    ? parseDate(dtstart)
    : { date: new Date(0), allDay: false }
  const dtend = get('DTEND')
  const end = dtend
    ? parseDate(dtend)
    : { date: start.date, allDay: start.allDay }
  const rrule = get('RRULE')
  const recurrenceId = get('RECURRENCE-ID')
  const lastModified = get('LAST-MODIFIED') ?? get('DTSTAMP')
  const summary = get('SUMMARY')?.value
  const description = get('DESCRIPTION')?.value
  const location = get('LOCATION')?.value
  return {
    uid: get('UID')?.value.trim() ?? null,
    summary: summary
      ? unescapeText(summary).trim() || '(no title)'
      : '(no title)',
    description: description ? unescapeText(description) : null,
    location: location ? unescapeText(location) : null,
    startsAt: start.date,
    endsAt: end.date,
    allDay: start.allDay,
    // An occurrence override is a single instance, never itself a series.
    recurrence:
      rrule && !recurrenceId
        ? fromGoogleRecurrence(
            [`RRULE:${rrule.value.trim()}`],
            start.date.toISOString().slice(0, 10),
          )
        : null,
    recurrenceId: recurrenceId ? parseDate(recurrenceId).date : null,
    updatedAt: lastModified ? parseDate(lastModified).date : new Date(0),
    cancelled: get('STATUS')?.value.trim().toUpperCase() === 'CANCELLED',
  }
}

// Every VEVENT in a VCALENDAR document (a series master plus any occurrence
// overrides all live in one resource).
export function parseCalendarEvents(ics: string): ParsedEvent[] {
  const events: ParsedEvent[] = []
  let current: Prop[] | null = null
  for (const line of unfold(ics)) {
    if (line.trim() === 'BEGIN:VEVENT') {
      current = []
    } else if (line.trim() === 'END:VEVENT') {
      if (current) {
        events.push(buildEvent(current))
      }
      current = null
    } else if (current) {
      const prop = parseProp(line)
      if (prop && prop.name) {
        current.push(prop)
      }
    }
  }
  return events
}

function stamp(date: Date, allDay: boolean): string {
  const iso = date.toISOString()
  return allDay
    ? iso.slice(0, 10).replace(/-/g, '')
    : `${iso.slice(0, 19).replace(/[-:]/g, '')}Z`
}

function octets(value: string): number {
  return Buffer.byteLength(value, 'utf8')
}

// Fold a content line to <=75 octets per RFC 5545 (CRLF + a leading space on
// each continuation). Splits on code-point boundaries — never inside a
// multi-byte character — and measures octets, so an emoji at the boundary is
// not cut into lone surrogates.
function foldLine(line: string): string {
  if (octets(line) <= 75) {
    return line
  }
  const parts: string[] = []
  let chunk = ''
  // The first line may use 75 octets; a continuation spends one on its leading
  // space, leaving 74 for content.
  let limit = 75
  for (const ch of line) {
    if (octets(chunk) + octets(ch) > limit) {
      parts.push(chunk)
      chunk = ch
      limit = 74
    } else {
      chunk += ch
    }
  }
  parts.push(chunk)
  return parts
    .map((part, index) => (index === 0 ? part : ` ${part}`))
    .join('\r\n')
}

export type BuildCalendarInput = {
  uid: string
  summary: string
  description: string | null
  location: string | null
  startsAt: Date
  endsAt: Date
  allDay: boolean
  recurrence: RecurrenceRule | null
  dtstamp: Date
}

// A single-VEVENT VCALENDAR document to PUT to a CalDAV collection.
export function buildCalendar(input: BuildCalendarInput): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lifedeck//Calendar//EN',
    'BEGIN:VEVENT',
    `UID:${input.uid}`,
    `DTSTAMP:${stamp(input.dtstamp, false)}`,
    input.allDay
      ? `DTSTART;VALUE=DATE:${stamp(input.startsAt, true)}`
      : `DTSTART:${stamp(input.startsAt, false)}`,
    input.allDay
      ? `DTEND;VALUE=DATE:${stamp(input.endsAt, true)}`
      : `DTEND:${stamp(input.endsAt, false)}`,
    `SUMMARY:${escapeText(input.summary)}`,
    ...(input.description
      ? [`DESCRIPTION:${escapeText(input.description)}`]
      : []),
    ...(input.location ? [`LOCATION:${escapeText(input.location)}`] : []),
    ...(input.recurrence
      ? toGoogleRecurrence(input.recurrence).map(line =>
          // For an all-day (DATE) DTSTART, RFC 5545 requires a matching DATE
          // UNTIL, not the DATE-TIME form the shared mapper emits.
          input.allDay
            ? line.replace(/UNTIL=(\d{8})T\d{6}Z/, 'UNTIL=$1')
            : line,
        )
      : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(foldLine).join('\r\n')
}
