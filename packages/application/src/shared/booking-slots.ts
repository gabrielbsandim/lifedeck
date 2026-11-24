import {
  bookableSlots,
  civilDate,
  type Booking,
  type BookingPage,
  type BookingService,
  type TimeInterval,
} from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import type { AvailabilityRepository } from '@/ports/availability-repository'
import type { BookingRepository } from '@/ports/booking-repository'
import type { Clock } from '@/ports/clock'
import type { Logger } from '@/ports/logger'
import type { makeListCalendarEvents } from '@/use-cases/list-calendar-events'
import type { makePullCalendarChanges } from '@/use-cases/pull-calendar-changes'

const DAY_MS = 24 * 60 * 60_000
// Busy time is read a little past both ends so buffers, a slot that runs past
// `to`, and the per-day count in any zone all see the bookings around them.
const READ_PAD_MS = 2 * DAY_MS
const HOST_HORIZON_DAYS = 365

export type SlotOptions = {
  // The booking being moved: its own time and event do not block it.
  exclude?: Booking | null
  // Hosts book on a client's behalf without the notice or horizon limits.
  asHost?: boolean
}

type Dependencies = {
  availability: Pick<AvailabilityRepository, 'getWeekly' | 'listOverrides'>
  bookings: Pick<BookingRepository, 'listByOwnerInRange'>
  listCalendarEvents: ReturnType<typeof makeListCalendarEvents>
  clock: Clock
}

export function makeServiceSlots({
  availability,
  bookings,
  listCalendarEvents,
  clock,
}: Dependencies) {
  return async function serviceSlots(
    page: BookingPage,
    service: BookingService,
    from: Date,
    to: Date,
    options: SlotOptions = {},
  ): Promise<TimeInterval[]> {
    const readFrom = new Date(from.getTime() - READ_PAD_MS)
    const readTo = new Date(to.getTime() + READ_PAD_MS)
    const ownerId = page.ownerId as string
    const excluded = options.exclude ?? null
    const [weekly, overrides, events, held] = await Promise.all([
      availability.getWeekly(page.id),
      availability.listOverrides(
        page.id,
        civilDate(readFrom, page.timezone),
        civilDate(readTo, page.timezone),
      ),
      listCalendarEvents(ownerId, {
        from: readFrom.toISOString(),
        to: readTo.toISOString(),
      }),
      bookings.listByOwnerInRange(page.ownerId, readFrom, readTo),
    ])

    const holding = held.filter(
      booking => booking.holdsSlot && booking.id !== excluded?.id,
    )
    const busy: TimeInterval[] = [
      ...events
        .filter(
          event =>
            event.busy &&
            !event.allDay &&
            event.id !== excluded?.calendarEventId,
        )
        .map(event => ({
          start: new Date(event.startsAt),
          end: new Date(event.endsAt),
        })),
      ...holding.map(booking => ({
        start: booking.startsAt,
        end: booking.endsAt,
      })),
    ]
    const settings = service.toJSON()
    return bookableSlots({
      timezone: page.timezone,
      weekly,
      overrides,
      from,
      to,
      now: clock.now(),
      durationMin: settings.durationMin,
      slotStepMin: settings.slotStepMin,
      bufferBeforeMin: settings.bufferBeforeMin,
      bufferAfterMin: settings.bufferAfterMin,
      minNoticeMin: options.asHost ? 0 : settings.minNoticeMin,
      maxHorizonDays: options.asHost
        ? HOST_HORIZON_DAYS
        : settings.maxHorizonDays,
      maxPerDay: settings.maxPerDay,
      busy,
      bookedStarts: holding
        .filter(booking => booking.serviceId === service.id)
        .map(booking => booking.startsAt),
    })
  }
}

export type ServiceSlots = ReturnType<typeof makeServiceSlots>

/** Recomputes the one slot from fresh data; the browser's copy is never trusted. */
export async function isSlotOpen(
  serviceSlots: ServiceSlots,
  page: BookingPage,
  service: BookingService,
  startsAt: Date,
  options: SlotOptions = {},
): Promise<boolean> {
  const slots = await serviceSlots(
    page,
    service,
    startsAt,
    new Date(startsAt.getTime() + 1),
    options,
  )
  return slots.some(slot => slot.start.getTime() === startsAt.getTime())
}

type RefreshDependencies = {
  pullCalendarChanges: ReturnType<typeof makePullCalendarChanges>
  logger?: Logger
}

// Inbound sync is webhook plus a sweep, so the local copy can lag by minutes.
// A booking first pulls the host's calendars; when that fails it still goes
// ahead on local data and the host is told (false means stale).
export function makeRefreshHostCalendar({
  pullCalendarChanges,
  logger,
}: RefreshDependencies) {
  return async function refreshHostCalendar(ownerId: string): Promise<boolean> {
    try {
      const result = await pullCalendarChanges(ownerId)
      return result.failed === 0
    } catch (error) {
      if (error instanceof NotFoundError) {
        return true
      }
      logger?.warn('booking_calendar_refresh_failed', {
        ownerId,
        error: error instanceof Error ? error.message : String(error),
      })
      return false
    }
  }
}

export type RefreshHostCalendar = ReturnType<typeof makeRefreshHostCalendar>
