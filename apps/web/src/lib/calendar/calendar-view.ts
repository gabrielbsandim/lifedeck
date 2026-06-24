import type { CalendarEventView } from '@lifedeck/application'

export type CalendarView = 'month' | 'week' | 'day'

export type CalendarRange = {
  from: string
  to: string
}

function startOfDayUtc(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

/**
 * The visible range for a view, anchored on `anchor` (a YYYY-MM-DD day). The
 * month view extends to whole weeks (Sunday-first) so the grid is always full.
 */
export function rangeFor(view: CalendarView, anchor: string): CalendarRange {
  const anchorDate = startOfDayUtc(new Date(`${anchor}T00:00:00.000Z`))

  if (view === 'day') {
    return {
      from: anchorDate.toISOString(),
      to: addDays(anchorDate, 1).toISOString(),
    }
  }

  if (view === 'week') {
    const weekStart = addDays(anchorDate, -anchorDate.getUTCDay())
    return {
      from: weekStart.toISOString(),
      to: addDays(weekStart, 7).toISOString(),
    }
  }

  const monthStart = new Date(
    Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth(), 1),
  )
  const gridStart = addDays(monthStart, -monthStart.getUTCDay())
  return {
    from: gridStart.toISOString(),
    to: addDays(gridStart, 42).toISOString(),
  }
}

/** Steps the anchor day forward or backward by one unit of the view. */
export function stepAnchor(
  view: CalendarView,
  anchor: string,
  direction: 1 | -1,
): string {
  const date = new Date(`${anchor}T00:00:00.000Z`)
  if (view === 'day') {
    date.setUTCDate(date.getUTCDate() + direction)
  } else if (view === 'week') {
    date.setUTCDate(date.getUTCDate() + direction * 7)
  } else {
    date.setUTCMonth(date.getUTCMonth() + direction)
  }
  return date.toISOString().slice(0, 10)
}

/** The 6x7 grid of days (YYYY-MM-DD) covering the month that contains `anchor`. */
export function monthGrid(anchor: string): string[][] {
  const { from } = rangeFor('month', anchor)
  const start = new Date(from)
  const weeks: string[][] = []
  for (let week = 0; week < 6; week += 1) {
    const days: string[] = []
    for (let day = 0; day < 7; day += 1) {
      days.push(
        addDays(start, week * 7 + day)
          .toISOString()
          .slice(0, 10),
      )
    }
    weeks.push(days)
  }
  return weeks
}

/** The 7 days (YYYY-MM-DD) of the week containing `anchor`, Sunday-first. */
export function weekDays(anchor: string): string[] {
  const { from } = rangeFor('week', anchor)
  const start = new Date(from)
  return Array.from({ length: 7 }, (_, index) =>
    addDays(start, index).toISOString().slice(0, 10),
  )
}

/** The local calendar day (in `timeZone`) an event starts on, as YYYY-MM-DD. */
export function eventDay(event: CalendarEventView, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date(event.startsAt))
}

/** Groups events by their local start day, each bucket sorted chronologically. */
export function groupByDay(
  events: CalendarEventView[],
  timeZone: string,
): Map<string, CalendarEventView[]> {
  const byDay = new Map<string, CalendarEventView[]>()
  const sorted = [...events].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  )
  for (const event of sorted) {
    const day = eventDay(event, timeZone)
    const bucket = byDay.get(day)
    if (bucket) {
      bucket.push(event)
    } else {
      byDay.set(day, [event])
    }
  }
  return byDay
}
