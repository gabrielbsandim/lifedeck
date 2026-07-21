import {
  DEFAULT_TIME_ZONE,
  asEntityId,
  civilDate,
  findFreeSlots as computeFreeSlots,
  isTimeZone,
  subtractIntervals,
  zonedInstant,
  type AssistantProfile,
  type TimeInterval,
} from '@lifedeck/domain'
import {
  findFreeSlotsInputSchema,
  type FindFreeSlotsInput,
  type FreeSlotView,
} from '@/dtos/find-free-slots-dto'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { UserRepository } from '@/ports/user-repository'
import type { makeListCalendarEvents } from '@/use-cases/list-calendar-events'

const DAY_MS = 24 * 60 * 60 * 1000
// The fallback work day when the profile has no work hours and none are passed.
const DEFAULT_WORK_START = 9
const DEFAULT_WORK_END = 18
// Bounds the scan (and the events query) no matter how wide a range is asked for.
const MAX_RANGE_DAYS = 31

type Dependencies = {
  users: Pick<UserRepository, 'findById'>
  listCalendarEvents: ReturnType<typeof makeListCalendarEvents>
  clock: Clock
}

// The quiet-hours blocks that land on civil day `date`, handling a window that
// wraps past midnight (e.g. 22-7) by blocking both the morning head and the
// evening tail of the day.
function quietBlocksForDay(
  profile: AssistantProfile,
  date: string,
  timezone: string,
): TimeInterval[] {
  const { quietHoursStart: start, quietHoursEnd: end } = profile
  if (start === null || end === null || start === end) {
    return []
  }
  if (start < end) {
    return [
      {
        start: zonedInstant(date, start, timezone),
        end: zonedInstant(date, end, timezone),
      },
    ]
  }
  return [
    {
      start: zonedInstant(date, 0, timezone),
      end: zonedInstant(date, end, timezone),
    },
    {
      start: zonedInstant(date, start, timezone),
      end: zonedInstant(date, 24, timezone),
    },
  ]
}

// The civil dates (YYYY-MM-DD, in `timezone`) that the [from, to] window touches.
function eachCivilDay(from: Date, to: Date, timezone: string): string[] {
  const last = civilDate(to, timezone)
  const days: string[] = []
  let cursor = civilDate(from, timezone)
  for (let i = 0; i <= MAX_RANGE_DAYS && cursor <= last; i += 1) {
    days.push(cursor)
    const next = new Date(`${cursor}T00:00:00.000Z`)
    next.setUTCDate(next.getUTCDate() + 1)
    cursor = next.toISOString().slice(0, 10)
  }
  return days
}

export function makeFindFreeSlots({
  users,
  listCalendarEvents,
  clock,
}: Dependencies) {
  return async function findFreeSlots(
    ownerId: string,
    rawInput: FindFreeSlotsInput,
  ): Promise<FreeSlotView[]> {
    const input = findFreeSlotsInputSchema.parse(rawInput)
    const user = await users.findById(asEntityId(ownerId))
    if (!user) {
      throw new NotFoundError('User')
    }
    const timezone = isTimeZone(user.timezone)
      ? user.timezone
      : DEFAULT_TIME_ZONE
    const profile = user.assistantProfile

    const workStart =
      input.workDayStart ?? profile.workHoursStart ?? DEFAULT_WORK_START
    const workEnd = input.workDayEnd ?? profile.workHoursEnd ?? DEFAULT_WORK_END

    // Never propose a slot in the past, and cap how far ahead we scan.
    const now = clock.now().getTime()
    const rangeStart = Math.max(Date.parse(input.from), now)
    const rangeEnd = Math.min(
      Date.parse(input.to),
      rangeStart + MAX_RANGE_DAYS * DAY_MS,
    )
    if (workEnd <= workStart || rangeEnd <= rangeStart) {
      return []
    }

    // Candidate windows: each civil day's work span, minus quiet hours, clipped
    // to the requested range and the not-in-the-past floor.
    const windows: TimeInterval[] = []
    for (const day of eachCivilDay(
      new Date(rangeStart),
      new Date(rangeEnd),
      timezone,
    )) {
      const clippedStart = Math.max(
        zonedInstant(day, workStart, timezone).getTime(),
        rangeStart,
      )
      const clippedEnd = Math.min(
        zonedInstant(day, workEnd, timezone).getTime(),
        rangeEnd,
      )
      if (clippedEnd <= clippedStart) {
        continue
      }
      windows.push(
        ...subtractIntervals(
          [{ start: new Date(clippedStart), end: new Date(clippedEnd) }],
          quietBlocksForDay(profile, day, timezone),
        ),
      )
    }
    if (windows.length === 0) {
      return []
    }

    // Busy: existing events in range. All-day events are usually informational
    // (birthdays, reminders) rather than blocking, so they do not count as busy.
    const events = await listCalendarEvents(ownerId, {
      from: new Date(rangeStart).toISOString(),
      to: new Date(rangeEnd).toISOString(),
    })
    const busy: TimeInterval[] = events
      .filter(event => !event.allDay)
      .map(event => ({
        start: new Date(event.startsAt),
        end: new Date(event.endsAt),
      }))

    const slots = computeFreeSlots({
      windows,
      busy,
      durationMin: input.durationMin,
      granularityMin: input.granularityMin,
      maxResults: input.maxResults,
    })
    return slots.map(slot => ({
      startsAt: slot.start.toISOString(),
      endsAt: slot.end.toISOString(),
    }))
  }
}
