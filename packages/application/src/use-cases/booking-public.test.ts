import { describe, expect, it, vi } from 'vitest'
import { Booking, asEntityId } from '@lifedeck/domain'
import { NotFoundError, SlotTakenError } from '@/errors/use-case-error'
import {
  BOOKING_NOW,
  CLIENT_ID,
  OWNER,
  SERVICE_ID,
  at,
  bookingFixture,
} from '@/testing/booking-fixture'
import { BOOKING_NOTICE_JOB, BOOKING_REMINDER_JOB } from '@/shared/booking-jobs'
import { CALENDAR_PUSH_JOB } from '@/use-cases/calendar-sync-jobs'
import { makeGetPublicBookingPage } from '@/use-cases/get-public-booking-page'
import { makeListBookableSlots } from '@/use-cases/list-bookable-slots'
import { makeRequestBooking } from '@/use-cases/request-booking'

const MONDAY = {
  from: '2026-06-22T00:00:00.000Z',
  to: '2026-06-23T00:00:00.000Z',
}
const TUESDAY = {
  from: '2026-06-23T00:00:00.000Z',
  to: '2026-06-24T00:00:00.000Z',
}
const CLIENT = { name: 'João', email: 'Joao@Mail.com' }

function setup(options: Parameters<typeof bookingFixture>[0] = {}) {
  const fx = bookingFixture(options)
  const hours = async (range = MONDAY) =>
    (
      await makeListBookableSlots(fx)('ana', {
        serviceId: SERVICE_ID,
        ...range,
      })
    ).map(slot => slot.startsAt.slice(11, 16))
  return {
    fx,
    hours,
    getPage: makeGetPublicBookingPage(fx),
    request: makeRequestBooking(fx),
  }
}

describe('getPublicBookingPage', () => {
  it('shows active services without the location detail', async () => {
    const { fx, getPage } = setup()
    await fx.seedPage({ priceLabel: 'R$ 80' })
    const page = await getPage(' ANA ')
    expect(page).toMatchObject({ slug: 'ana', displayName: 'Ana Lima' })
    expect(page.services).toEqual([
      {
        id: SERVICE_ID,
        name: 'Aula',
        description: null,
        durationMin: 60,
        locationKind: 'online-link',
        priceLabel: 'R$ 80',
        requiresApproval: false,
      },
    ])
  })

  it('hides archived services', async () => {
    const { fx, getPage } = setup()
    const { service } = await fx.seedPage()
    service.archive(BOOKING_NOW)
    await fx.services.save(service)
    expect((await getPage('ana')).services).toEqual([])
  })

  it('looks missing when switched off, unknown, or the plan lapsed', async () => {
    const lapsed = setup({ grants: ['calendarSync'] })
    await lapsed.fx.seedPage()
    await expect(lapsed.getPage('ana')).rejects.toBeInstanceOf(NotFoundError)

    const { fx, getPage } = setup()
    const { page } = await fx.seedPage()
    await expect(getPage('nobody')).rejects.toBeInstanceOf(NotFoundError)
    page.setActive(false, BOOKING_NOW)
    await fx.pages.save(page)
    await expect(getPage('ana')).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('listBookableSlots', () => {
  it('offers the weekly hours of the requested range', async () => {
    const { fx, hours } = setup()
    await fx.seedPage()
    expect(await hours()).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00'])
  })

  it('blocks busy events and held bookings, not free time or released ones', async () => {
    const { fx, hours } = setup()
    await fx.seedPage()
    await fx.seedClient()
    await fx.seedEvent('2026-06-22T09:00:00.000Z', '2026-06-22T10:00:00.000Z')
    await fx.seedEvent(
      '2026-06-22T11:00:00.000Z',
      '2026-06-22T12:00:00.000Z',
      false,
    )
    const released = Booking.create({
      id: asEntityId('66666666-6666-4666-8666-666666666666'),
      ownerId: OWNER,
      serviceId: SERVICE_ID,
      clientId: CLIENT_ID,
      startsAt: at('2026-06-22T10:00:00.000Z'),
      endsAt: at('2026-06-22T11:00:00.000Z'),
      requiresApproval: false,
      source: 'public',
      now: BOOKING_NOW,
    })
    released.cancel(null, BOOKING_NOW)
    await fx.bookings.save(released)
    expect(await hours()).toEqual(['10:00', '10:30', '11:00'])
  })

  it('stops a day at the service maximum', async () => {
    const { fx, hours, request } = setup()
    await fx.seedPage({ maxPerDay: 1 })
    await request('ana', {
      ...CLIENT,
      serviceId: SERVICE_ID,
      startsAt: '2026-06-22T11:00:00.000Z',
    })
    expect(await hours()).toEqual([])
  })

  it('caps the range at a month and refuses an inverted one', async () => {
    const { fx, hours } = setup()
    await fx.seedPage({ maxHorizonDays: 365 })
    const year = await hours({
      from: '2026-06-22T00:00:00.000Z',
      to: '2027-06-22T00:00:00.000Z',
    })
    // 31 days from a Monday hold 5 Mondays and 5 Tuesdays, 5 slots each.
    expect(year).toHaveLength(50)
    expect(await hours({ from: MONDAY.to, to: MONDAY.from })).toEqual([])
  })

  it('refuses a service from another page or an archived one', async () => {
    const { fx, hours } = setup()
    const { service } = await fx.seedPage()
    service.archive(BOOKING_NOW)
    await fx.services.save(service)
    await expect(hours()).rejects.toThrow('Booking service was not found')
  })
})

describe('requestBooking', () => {
  const input = {
    ...CLIENT,
    serviceId: SERVICE_ID,
    startsAt: '2026-06-23T10:00:00.000Z',
    phone: '+55 11 98765-4321',
    note: 'First class',
    timezone: 'America/Sao_Paulo',
  }

  it('confirms, creates the event and queues the notices', async () => {
    const { fx, request, hours } = setup()
    await fx.seedPage()
    const result = await request('ana', input)
    expect(result).toMatchObject({
      status: 'confirmed',
      startsAt: '2026-06-23T10:00:00.000Z',
      endsAt: '2026-06-23T11:00:00.000Z',
      manageToken: `signed.${result.bookingId}`,
    })

    const booking = await fx.bookings.findById(asEntityId(result.bookingId))
    expect(booking?.toJSON()).toMatchObject({
      source: 'public',
      clientTimezone: 'America/Sao_Paulo',
      note: 'First class',
    })
    const event = await fx.calendarEvents.findById(booking!.calendarEventId!)
    expect(event?.toJSON()).toMatchObject({
      title: 'Aula com João',
      location: 'https://meet.test/ana',
      description: 'joao@mail.com · +5511987654321\n\nFirst class',
      reminders: [30],
    })

    const types = fx.jobs.map(job => job.type)
    expect(types).toContain(CALENDAR_PUSH_JOB)
    expect(
      fx.jobs.find(job => job.type === BOOKING_NOTICE_JOB)?.payload,
    ).toEqual({
      bookingId: result.bookingId,
      kind: 'confirmed',
      byClient: true,
      calendarStale: false,
    })
    expect(types).toContain(BOOKING_REMINDER_JOB)
    expect(await hours(TUESDAY)).not.toContain('10:00')
  })

  it('holds the slot as pending when the service needs approval', async () => {
    const { fx, request } = setup()
    await fx.seedPage({ requiresApproval: true })
    const result = await request('ana', input)
    expect(result.status).toBe('pending')
    const notice = fx.jobs.find(job => job.type === BOOKING_NOTICE_JOB)
    expect(notice?.payload.kind).toBe('requested')
    expect(fx.jobs.map(job => job.type)).not.toContain(BOOKING_REMINDER_JOB)
  })

  it('reuses the client found by phone and fills the gaps', async () => {
    const { fx, request } = setup()
    await fx.seedPage()
    await fx.seedClient()
    await request('ana', {
      ...input,
      name: 'João Pedro',
      email: 'jp@mail.com',
    })
    const all = await fx.clients.listByOwner(OWNER)
    expect(all.map(client => [client.name, client.email])).toEqual([
      ['João Pedro', 'jp@mail.com'],
    ])
  })

  it('reuses a client found by email when no phone is given', async () => {
    const { fx, request } = setup()
    await fx.seedPage()
    await fx.seedClient()
    await request('ana', {
      ...CLIENT,
      serviceId: SERVICE_ID,
      startsAt: input.startsAt,
    })
    expect(await fx.clients.listByOwner(OWNER)).toHaveLength(1)
  })

  it('pulls the host calendar first, so a fresh event wins', async () => {
    const pull = vi.fn(async () => {
      await fx.seedEvent('2026-06-23T10:00:00.000Z', '2026-06-23T10:30:00.000Z')
      return { applied: 1, failed: 0 }
    })
    const { fx, request } = setup({ pull })
    await fx.seedPage()
    await expect(request('ana', input)).rejects.toBeInstanceOf(SlotTakenError)
    expect(pull).toHaveBeenCalledWith(OWNER)
    expect(
      await fx.bookings.listByOwnerInRange(
        OWNER,
        at(TUESDAY.from),
        at(TUESDAY.to),
      ),
    ).toEqual([])
  })

  it('books on local data when the pull fails, and flags it', async () => {
    const pull = vi.fn(async () => {
      throw new Error('Google is down')
    })
    const { fx, request } = setup({ pull })
    await fx.seedPage()
    await request('ana', input)
    expect(fx.warnings).toEqual(['booking_calendar_refresh_failed'])
    const notice = fx.jobs.find(job => job.type === BOOKING_NOTICE_JOB)
    expect(notice?.payload.calendarStale).toBe(true)
  })

  it('treats a partial pull as stale and no connection as fresh', async () => {
    const partial = setup({ pull: async () => ({ applied: 0, failed: 1 }) })
    await partial.fx.seedPage()
    await partial.request('ana', input)
    const stale = partial.fx.jobs.find(job => job.type === BOOKING_NOTICE_JOB)
    expect(stale?.payload.calendarStale).toBe(true)

    const unlinked = setup({
      pull: async () => {
        throw new NotFoundError('Calendar connection')
      },
    })
    await unlinked.fx.seedPage()
    await unlinked.request('ana', input)
    expect(unlinked.fx.warnings).toEqual([])
  })

  it('refuses a time that is not offered', async () => {
    const { fx, request } = setup()
    await fx.seedPage()
    await expect(
      request('ana', { ...input, startsAt: '2026-06-23T10:15:00.000Z' }),
    ).rejects.toBeInstanceOf(SlotTakenError)
    await expect(
      request('ana', { ...input, startsAt: '2026-06-24T10:00:00.000Z' }),
    ).rejects.toBeInstanceOf(SlotTakenError)
  })

  it('lets only one of two racing requests win', async () => {
    const { fx, request } = setup()
    await fx.seedPage()
    const results = await Promise.allSettled([
      request('ana', input),
      request('ana', { ...input, email: 'other@mail.com', phone: null }),
    ])
    expect(results.map(result => result.status).sort()).toEqual([
      'fulfilled',
      'rejected',
    ])
  })

  it('needs an email', async () => {
    const { fx, request } = setup()
    await fx.seedPage()
    await expect(request('ana', { ...input, email: ' ' })).rejects.toThrow()
  })
})
