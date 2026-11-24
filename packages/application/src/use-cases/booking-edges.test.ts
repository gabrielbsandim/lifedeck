import { describe, expect, it } from 'vitest'
import { Booking, asEntityId, type BookingLocation } from '@lifedeck/domain'
import { BOOKING_NOTICE_JOB, BOOKING_REMINDER_JOB } from '@/shared/booking-jobs'
import { makeBookingLifecycle } from '@/shared/booking-records'
import {
  BOOKING_NOW,
  CLIENT_ID,
  OWNER,
  SERVICE_ID,
  at,
  bookingFixture,
  type BookingFixture,
} from '@/testing/booking-fixture'
import { makeCancelBookingByToken } from '@/use-cases/cancel-booking-by-token'
import { makeCreateBookingForClient } from '@/use-cases/create-booking-for-client'
import { makeDeliverBookingNotice } from '@/use-cases/deliver-booking-notice'
import { makeDeliverBookingReminder } from '@/use-cases/deliver-booking-reminder'
import { makeGetManagedBooking } from '@/use-cases/get-managed-booking'
import { makeListBookingClients } from '@/use-cases/list-booking-clients'
import { makeListBookings } from '@/use-cases/list-bookings'
import { makeRequestBooking } from '@/use-cases/request-booking'
import { makeUpsertBookingClientForHost } from '@/use-cases/upsert-booking-client'

const TUESDAY_10 = '2026-06-23T10:00:00.000Z'
const ORPHAN = asEntityId('88888888-8888-4888-8888-888888888888')

function orphanBooking(serviceId = ORPHAN, clientId = ORPHAN) {
  return Booking.create({
    id: asEntityId('66666666-6666-4666-8666-666666666666'),
    ownerId: OWNER,
    serviceId,
    clientId,
    startsAt: at('2026-06-23T15:00:00.000Z'),
    endsAt: at('2026-06-23T16:00:00.000Z'),
    requiresApproval: false,
    source: 'host',
    now: BOOKING_NOW,
  })
}

async function hostBooking(fx: BookingFixture) {
  await fx.seedClient()
  return makeCreateBookingForClient(fx)(OWNER, {
    serviceId: SERVICE_ID,
    clientId: CLIENT_ID,
    startsAt: TUESDAY_10,
  })
}

describe('calendar event details per location', () => {
  it.each<[BookingLocation, string | null]>([
    [{ kind: 'in-person', address: 'Rua A, 1' }, 'Rua A, 1'],
    [{ kind: 'phone' }, '+5511987654321'],
    [{ kind: 'online-meet' }, null],
  ])('%o puts %s in the event', async (location, expected) => {
    const fx = bookingFixture()
    await fx.seedPage({ location })
    const view = await hostBooking(fx)
    const event = await fx.calendarEvents.findById(
      asEntityId(view.calendarEventId!),
    )
    expect(event?.toJSON().location).toBe(expected)
  })
})

describe('lifecycle when the calendar misbehaves', () => {
  function failingLifecycle(fx: BookingFixture) {
    const broken = async () => {
      throw new Error('database gone')
    }
    return makeBookingLifecycle({
      ...fx,
      createCalendarEvent: async () => {
        throw new Error('unused')
      },
      updateCalendarEvent: broken,
      deleteCalendarEvent: broken,
    })
  }

  it('surfaces an unexpected failure from the event delete or move', async () => {
    const fx = bookingFixture()
    await fx.seedPage()
    const view = await hostBooking(fx)
    const booking = await fx.bookings.findById(asEntityId(view.id))
    const lifecycle = failingLifecycle(fx)
    await expect(
      lifecycle.move(booking!, 60, at('2026-06-23T09:00:00.000Z'), false),
    ).rejects.toThrow('database gone')
    await expect(
      lifecycle.release(booking!, 'cancelled', null, false),
    ).rejects.toThrow('database gone')
  })

  it('moves and releases a booking that has no event', async () => {
    const fx = bookingFixture()
    await fx.seedPage()
    const view = await hostBooking(fx)
    const booking = await fx.bookings.findById(asEntityId(view.id))
    booking!.linkCalendarEvent(null, BOOKING_NOW)
    await fx.bookings.save(booking!)
    await fx.lifecycle.move(booking!, 60, at('2026-06-23T09:00:00.000Z'), false)
    await fx.lifecycle.release(booking!, 'cancelled', null, false)
    expect(booking!.status).toBe('cancelled')
  })
})

describe('missing pieces', () => {
  it('lists a booking whose service and client are gone', async () => {
    const fx = bookingFixture()
    await fx.seedPage()
    await fx.bookings.save(orphanBooking())
    const [view] = await makeListBookings(fx)(OWNER, {
      from: '2026-06-22T00:00:00.000Z',
      to: '2026-06-24T00:00:00.000Z',
    })
    expect(view).toMatchObject({ serviceName: null, client: null })
  })

  it('treats a link to an incomplete booking as unknown', async () => {
    const fx = bookingFixture()
    await fx.seedPage()
    const orphan = orphanBooking(SERVICE_ID)
    await fx.bookings.save(orphan)
    await expect(
      makeGetManagedBooking(fx)(fx.tokens.sign(orphan.id as string)),
    ).rejects.toThrow('Booking was not found')
  })

  it('sends nothing for a booking whose parts are gone', async () => {
    const fx = bookingFixture()
    await fx.seedPage()
    const orphan = orphanBooking()
    await fx.bookings.save(orphan)
    const payload = { bookingId: orphan.id as string }
    await makeDeliverBookingNotice(fx)({
      ...payload,
      kind: 'confirmed',
      byClient: true,
    })
    await makeDeliverBookingReminder(fx)({
      ...payload,
      startsAt: orphan.startsAt.toISOString(),
    })
    expect(fx.emailSender.bookingNotices).toEqual([])
  })

  it('falls back to the page zone and language without a client zone or host', async () => {
    const fx = bookingFixture()
    await fx.seedPage()
    const booked = await makeRequestBooking(fx)('ana', {
      serviceId: SERVICE_ID,
      startsAt: TUESDAY_10,
      name: 'João',
      email: 'joao@mail.com',
    })
    const deliver = makeDeliverBookingNotice({
      ...fx,
      users: { findById: async () => null },
    })
    const notice = fx.jobs.find(job => job.type === BOOKING_NOTICE_JOB)
    await deliver(notice!.payload)
    expect(fx.emailSender.bookingNotices[0]?.notice.timeZone).toBe('UTC')
    const [bell] = await fx.notifications.listByUser(OWNER, 10)
    expect(bell?.toJSON().data.bookingId).toBe(booked.bookingId)
    expect(fx.jobs.map(job => job.type)).toContain(BOOKING_REMINDER_JOB)
  })

  it('logs a pull that fails with a non-error value', async () => {
    const fx = bookingFixture({
      pull: () => Promise.reject(new Error('down')),
    })
    expect(await fx.refreshHostCalendar(OWNER)).toBe(false)
    const odd = bookingFixture({
      pull: () => Promise.reject('down'),
    })
    expect(await odd.refreshHostCalendar(OWNER)).toBe(false)
  })
})

describe('clients without an email', () => {
  it('adds a phone-only client and finds it by name', async () => {
    const fx = bookingFixture()
    await fx.seedPage()
    await makeUpsertBookingClientForHost(fx)(OWNER, {
      name: 'Zé',
      phone: '+5511900000000',
    })
    const found = await makeListBookingClients(fx)(OWNER, { search: 'zé' })
    expect(found.map(client => client.email)).toEqual([null])
  })

  it('cancels by link without a reason', async () => {
    const fx = bookingFixture()
    await fx.seedPage()
    const booked = await makeRequestBooking(fx)('ana', {
      serviceId: SERVICE_ID,
      startsAt: TUESDAY_10,
      name: 'João',
      email: 'joao@mail.com',
    })
    const view = await makeCancelBookingByToken(fx)(booked.manageToken)
    expect(view.status).toBe('cancelled')
  })
})
