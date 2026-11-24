import { describe, expect, it, vi } from 'vitest'
import { CalendarConnection, asEntityId } from '@lifedeck/domain'
import type { ExternalCalendarEvent } from '@/ports/calendar-provider'
import { SlotTakenError } from '@/errors/use-case-error'
import { BOOKING_NOTICE_JOB } from '@/shared/booking-jobs'
import { makeBookingCalendarSync } from '@/shared/booking-calendar-sync'
import { makeBookingMailer } from '@/shared/booking-notice'
import {
  APP_URL,
  SERVICE_ID,
  at,
  bookingFixture,
  type BookingFixture,
} from '@/testing/booking-fixture'
import { InMemoryCalendarConnectionRepository } from '@/testing/in-memory-calendar-connection-repository'
import { makeDeliverBookingNotice } from '@/use-cases/deliver-booking-notice'
import { makeGetManagedBooking } from '@/use-cases/get-managed-booking'
import { makePullCalendarChanges } from '@/use-cases/pull-calendar-changes'
import { makeRequestBooking } from '@/use-cases/request-booking'

const TUESDAY_10 = '2026-06-23T10:00:00.000Z'
const CONNECTION = asEntityId('66666666-6666-4666-8666-666666666666')
const MEET = 'https://meet.google.com/abc-defg-hij'

function remote(
  overrides: Partial<ExternalCalendarEvent>,
): ExternalCalendarEvent {
  return {
    externalId: 'g-booking',
    etag: 'etag-2',
    title: 'Aula com João',
    description: null,
    location: null,
    startsAt: at(TUESDAY_10),
    endsAt: at('2026-06-23T11:00:00.000Z'),
    allDay: false,
    recurrence: null,
    reminders: [],
    busy: true,
    conferenceUrl: null,
    updatedAt: at('2026-06-22T00:00:00.000Z'),
    recurringEventExternalId: null,
    originalStartsAt: null,
    cancelledOccurrence: false,
    deleted: false,
    ...overrides,
  }
}

async function bookedAndSynced(
  options: { requiresApproval?: boolean; settings?: object } = {},
) {
  const fx = bookingFixture()
  await fx.seedPage({
    requiresApproval: options.requiresApproval ?? false,
    ...options.settings,
  })
  const booked = await makeRequestBooking(fx)('ana', {
    serviceId: SERVICE_ID,
    startsAt: TUESDAY_10,
    name: 'João',
    email: 'joao@mail.com',
  })
  const booking = await fx.bookings.findById(asEntityId(booked.bookingId))
  const event = await fx.calendarEvents.findById(booking!.calendarEventId!)
  event!.linkToExternal('g-booking', 'etag-1', fx.clock.now(), CONNECTION)
  await fx.calendarEvents.save(event!)

  const calendarConnections = new InMemoryCalendarConnectionRepository()
  await calendarConnections.save(
    CalendarConnection.create({
      id: CONNECTION,
      ownerId: booking!.ownerId,
      provider: 'google',
      accessToken: 'access',
      refreshToken: 'refresh',
      tokenExpiresAt: at('2026-06-22T00:00:00.000Z'),
      now: fx.clock.now(),
    }),
  )
  const listChanges = vi.fn()
  const pull = makePullCalendarChanges({
    ...fx,
    calendarConnections,
    providers: {
      get: () => ({
        provider: 'google',
        exchangeCode: vi.fn(),
        refreshAccessToken: vi.fn(),
        listChanges,
        pushEvent: vi.fn(),
        deleteEvent: vi.fn(),
        watch: vi.fn(),
      }),
    },
    bookingSync: makeBookingCalendarSync(fx),
  })
  const pullWith = async (change: Partial<ExternalCalendarEvent>) => {
    listChanges.mockResolvedValueOnce({
      events: [remote(change)],
      nextSyncToken: null,
    })
    fx.jobs.length = 0
    await pull(booking!.ownerId as string)
    return fx.bookings.findById(booking!.id)
  }
  return { fx, booking: booking!, event: event!, pullWith }
}

describe('Google edits flow back into bookings', () => {
  it('cancels the booking and tells the client when the event is deleted', async () => {
    const { fx, event, pullWith } = await bookedAndSynced()

    const after = await pullWith({ deleted: true })

    expect(after?.status).toBe('cancelled')
    expect(after?.calendarEventId).toBeNull()
    expect(await fx.calendarEvents.findById(event.id)).toBeNull()
    const notice = fx.jobs.find(job => job.type === BOOKING_NOTICE_JOB)
    expect(notice?.payload).toMatchObject({
      kind: 'cancelled',
      byClient: false,
    })
    await makeDeliverBookingNotice(fx)(notice!.payload)
    expect(fx.emailSender.bookingNotices.at(-1)?.notice.kind).toBe('cancelled')
  })

  it('declines a request still waiting for approval', async () => {
    const { pullWith } = await bookedAndSynced({ requiresApproval: true })
    expect((await pullWith({ deleted: true }))?.status).toBe('declined')
  })

  it('moves the booking with the event and sends the new time', async () => {
    const { fx, pullWith } = await bookedAndSynced()

    const after = await pullWith({
      startsAt: at('2026-06-23T14:00:00.000Z'),
      endsAt: at('2026-06-23T15:30:00.000Z'),
    })

    expect(after?.startsAt).toEqual(at('2026-06-23T14:00:00.000Z'))
    expect(after?.endsAt).toEqual(at('2026-06-23T15:30:00.000Z'))
    expect(after?.status).toBe('confirmed')
    expect(fx.jobs.map(job => job.payload.kind)).toContain('rescheduled')
  })

  it('leaves the booking alone for an edit that keeps the time', async () => {
    const { fx, pullWith } = await bookedAndSynced()
    const after = await pullWith({ title: 'Renamed in Google' })
    expect(after?.startsAt).toEqual(at(TUESDAY_10))
    expect(fx.jobs.some(job => job.type === BOOKING_NOTICE_JOB)).toBe(false)
  })

  it('ignores a booking that no longer holds its slot', async () => {
    const { fx, booking, event } = await bookedAndSynced()
    booking.cancel(null, fx.clock.now())
    await fx.bookings.save(booking)
    const sync = makeBookingCalendarSync(fx)
    await sync.eventDeleted(event.id)
    await sync.eventMoved(
      event.id,
      at('2026-06-23T14:00:00.000Z'),
      at('2026-06-23T15:00:00.000Z'),
    )
    expect((await fx.bookings.findById(booking.id))?.calendarEventId).toBe(
      event.id,
    )
  })

  it('keeps the booking in place when the move lands on another booking', async () => {
    const { fx, event } = await bookedAndSynced()
    fx.jobs.length = 0
    const save = vi.spyOn(fx.bookings, 'save')
    save.mockRejectedValueOnce(new SlotTakenError())
    const sync = makeBookingCalendarSync(fx)
    await sync.eventMoved(
      event.id,
      at('2026-06-23T14:00:00.000Z'),
      at('2026-06-23T15:00:00.000Z'),
    )
    expect(fx.warnings).toContain('booking_calendar_move_rejected')
    expect(fx.jobs.some(job => job.type === BOOKING_NOTICE_JOB)).toBe(false)

    save.mockRejectedValueOnce(new Error('db down'))
    const broken = sync
    await expect(
      broken.eventMoved(
        event.id,
        at('2026-06-23T16:00:00.000Z'),
        at('2026-06-23T17:00:00.000Z'),
      ),
    ).rejects.toThrow('db down')
  })
})

describe('Google Meet on a booking', () => {
  const meetService = { location: { kind: 'online-meet' as const } }

  it('asks Google for a call and keeps the link it returns', async () => {
    const { fx, event, pullWith } = await bookedAndSynced({
      settings: meetService,
    })
    expect(event.conferenceRequested).toBe(true)
    await pullWith({
      conferenceUrl: MEET,
      updatedAt: at('2026-06-21T13:00:00.000Z'),
    })
    expect((await fx.calendarEvents.findById(event.id))?.conferenceUrl).toBe(
      MEET,
    )
  })

  it('pushes before the email so the client gets the link', async () => {
    const { fx, booking, event } = await bookedAndSynced({
      settings: meetService,
    })
    const pushCalendarEvent = vi.fn(async () => {
      event.setConferenceUrl(MEET)
      await fx.calendarEvents.save(event)
    })
    const mailer = makeMailer(fx, pushCalendarEvent)
    const parts = await mailer.partsOf(booking)
    expect(await mailer.meetingUrl(booking, parts!.service)).toBe(MEET)
    expect(await mailer.meetingUrl(booking, parts!.service)).toBe(MEET)
    expect(pushCalendarEvent).toHaveBeenCalledTimes(1)

    const view = await makeGetManagedBooking(fx)(
      fx.tokens.sign(booking.id as string),
    )
    expect(view.location).toEqual({ kind: 'online-meet', url: MEET })
  })

  it('sends the email without a link when the push fails', async () => {
    const { fx, booking } = await bookedAndSynced({ settings: meetService })
    const mailer = makeMailer(fx, async () => {
      throw new Error('Google down')
    })
    const parts = await mailer.partsOf(booking)
    await mailer.sendToClient(booking, 'confirmed', parts!)
    expect(fx.emailSender.bookingNotices.at(-1)?.notice.meetingUrl).toBeNull()
  })

  it('never looks for a link on other places or without a calendar', async () => {
    const { fx, booking } = await bookedAndSynced()
    const parts = await fx.mailer.partsOf(booking)
    expect(await fx.mailer.meetingUrl(booking, parts!.service)).toBeNull()
    const view = await makeGetManagedBooking({
      ...fx,
      calendarEvents: undefined,
    })(fx.tokens.sign(booking.id as string))
    expect(view.location.kind).toBe('online-link')
  })
})

function makeMailer(
  fx: BookingFixture,
  pushCalendarEvent: (ownerId: string, eventId: string) => Promise<unknown>,
) {
  return makeBookingMailer({
    ...fx,
    appUrl: APP_URL,
    pushCalendarEvent,
  })
}
