import {
  Booking,
  BookingClient,
  asEntityId,
  type BookingPage,
  type BookingService,
  type BookingSource,
  type EntityId,
} from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import type { BookingClientRepository } from '@/ports/booking-client-repository'
import type { BookingRepository } from '@/ports/booking-repository'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { JobQueue } from '@/ports/job-queue'
import type { UnitOfWork } from '@/ports/unit-of-work'
import { bookingNoticeJobs } from '@/shared/booking-jobs'
import type { makeCreateCalendarEvent } from '@/use-cases/create-calendar-event'
import type { makeDeleteCalendarEvent } from '@/use-cases/delete-calendar-event'
import type { makeUpdateCalendarEvent } from '@/use-cases/update-calendar-event'

const MINUTE_MS = 60_000
const HOST_REMINDER_MIN = 30

const WITH: Record<string, string> = { en: 'with', pt: 'com', es: 'con' }

export type ClientContact = {
  name: string
  email?: string | null
  phone?: string | null
  notes?: string | null
}

type ClientDependencies = {
  clients: BookingClientRepository
  ids: IdGenerator
  clock: Clock
}

/** Finds the host's client by phone, then email; a repeat only fills gaps. */
export function makeUpsertBookingClient({
  clients,
  ids,
  clock,
}: ClientDependencies) {
  return async function upsertBookingClient(
    ownerId: EntityId,
    contact: ClientContact,
  ): Promise<BookingClient> {
    const candidate = BookingClient.create({
      id: ids.generate(),
      ownerId,
      now: clock.now(),
      ...contact,
    })
    const byPhone = candidate.phone
      ? await clients.findByPhone(ownerId, candidate.phone)
      : null
    const existing =
      byPhone ??
      (candidate.email
        ? await clients.findByEmail(ownerId, candidate.email)
        : null)
    if (!existing) {
      await clients.save(candidate)
      return candidate
    }
    existing.mergeContact(contact, clock.now())
    await clients.save(existing)
    return existing
  }
}

export type UpsertBookingClient = ReturnType<typeof makeUpsertBookingClient>

type LifecycleDependencies = {
  bookings: BookingRepository
  createCalendarEvent: ReturnType<typeof makeCreateCalendarEvent>
  updateCalendarEvent: ReturnType<typeof makeUpdateCalendarEvent>
  deleteCalendarEvent: ReturnType<typeof makeDeleteCalendarEvent>
  jobQueue: JobQueue
  unitOfWork: UnitOfWork
  ids: IdGenerator
  clock: Clock
}

export type OpenBookingInput = {
  page: BookingPage
  service: BookingService
  client: BookingClient
  startsAt: Date
  source: BookingSource
  requiresApproval: boolean
  clientTimezone?: string | null
  note?: string | null
  byClient: boolean
  calendarStale?: boolean
}

function eventDetails(
  page: BookingPage,
  service: BookingService,
  client: BookingClient,
  note: string | null,
) {
  const location = service.location
  const where: Record<string, string | null> = {
    'online-link': location.kind === 'online-link' ? location.url : null,
    'in-person': location.kind === 'in-person' ? location.address : null,
    phone: client.phone,
    'online-meet': null,
  }
  const contact = [client.email, client.phone].filter(Boolean).join(' · ')
  return {
    title: `${service.name} ${WITH[page.locale] ?? WITH.en} ${client.name}`,
    description: [contact, note].filter(Boolean).join('\n\n') || null,
    location: where[location.kind] ?? null,
  }
}

/**
 * Every booking change goes through here so the linked calendar event, the
 * client notices and the reminder always move together, in one transaction.
 */
export function makeBookingLifecycle({
  bookings,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  jobQueue,
  unitOfWork,
  ids,
  clock,
}: LifecycleDependencies) {
  async function enqueueAll(
    jobs: ReturnType<typeof bookingNoticeJobs>,
  ): Promise<void> {
    for (const job of jobs) {
      await jobQueue.enqueue(job)
    }
  }

  // The event may already be gone (deleted in Google); the booking still moves.
  async function dropEvent(booking: Booking): Promise<void> {
    const eventId = booking.calendarEventId
    if (!eventId) {
      return
    }
    booking.linkCalendarEvent(null, clock.now())
    try {
      await deleteCalendarEvent(booking.ownerId as string, eventId as string)
    } catch (error) {
      if (!(error instanceof NotFoundError)) {
        throw error
      }
    }
  }

  async function open(input: OpenBookingInput): Promise<Booking> {
    const { page, service, client } = input
    return unitOfWork.run(async () => {
      const now = clock.now()
      const booking = Booking.create({
        id: ids.generate(),
        ownerId: page.ownerId,
        serviceId: service.id,
        clientId: client.id,
        startsAt: input.startsAt,
        endsAt: new Date(
          input.startsAt.getTime() + service.durationMin * MINUTE_MS,
        ),
        requiresApproval: input.requiresApproval,
        source: input.source,
        clientTimezone: input.clientTimezone,
        note: input.note,
        now,
      })
      await bookings.save(booking)
      const event = await createCalendarEvent(page.ownerId as string, {
        ...eventDetails(page, service, client, booking.toJSON().note),
        startsAt: booking.startsAt.toISOString(),
        endsAt: booking.endsAt.toISOString(),
        reminders: [HOST_REMINDER_MIN],
      })
      booking.linkCalendarEvent(asEntityId(event.id), now)
      await bookings.save(booking)
      const kind = booking.status === 'pending' ? 'requested' : 'confirmed'
      await enqueueAll(
        bookingNoticeJobs(booking, kind, {
          byClient: input.byClient,
          now,
          calendarStale: input.calendarStale,
        }),
      )
      return booking
    })
  }

  async function confirm(booking: Booking): Promise<void> {
    await unitOfWork.run(async () => {
      booking.confirm(clock.now())
      await bookings.save(booking)
      await enqueueAll(
        bookingNoticeJobs(booking, 'confirmed', {
          byClient: false,
          now: clock.now(),
        }),
      )
    })
  }

  async function release(
    booking: Booking,
    outcome: 'cancelled' | 'declined',
    reason: string | null,
    byClient: boolean,
  ): Promise<void> {
    await unitOfWork.run(async () => {
      const now = clock.now()
      if (outcome === 'declined') {
        booking.decline(reason, now)
      } else {
        booking.cancel(reason, now)
      }
      await dropEvent(booking)
      await bookings.save(booking)
      await enqueueAll(bookingNoticeJobs(booking, outcome, { byClient, now }))
    })
  }

  async function move(
    booking: Booking,
    durationMin: number,
    startsAt: Date,
    byClient: boolean,
  ): Promise<void> {
    await unitOfWork.run(async () => {
      const now = clock.now()
      const endsAt = new Date(startsAt.getTime() + durationMin * MINUTE_MS)
      booking.reschedule(startsAt, endsAt, now)
      await bookings.save(booking)
      await moveEvent(booking)
      await enqueueAll(
        bookingNoticeJobs(booking, 'rescheduled', { byClient, now }),
      )
    })
  }

  async function moveEvent(booking: Booking): Promise<void> {
    const eventId = booking.calendarEventId
    if (!eventId) {
      return
    }
    try {
      await updateCalendarEvent(booking.ownerId as string, eventId as string, {
        startsAt: booking.startsAt.toISOString(),
        endsAt: booking.endsAt.toISOString(),
      })
    } catch (error) {
      if (!(error instanceof NotFoundError)) {
        throw error
      }
      booking.linkCalendarEvent(null, clock.now())
      await bookings.save(booking)
    }
  }

  return { open, confirm, release, move }
}

export type BookingLifecycle = ReturnType<typeof makeBookingLifecycle>
