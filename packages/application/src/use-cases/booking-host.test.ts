import { describe, expect, it } from 'vitest'
import { asEntityId, ValidationError } from '@lifedeck/domain'
import { NotFoundError, SlotTakenError } from '@/errors/use-case-error'
import { BOOKING_NOTICE_JOB, BOOKING_REMINDER_JOB } from '@/shared/booking-jobs'
import {
  CLIENT_ID,
  OWNER,
  SERVICE_ID,
  STRANGER,
  at,
  bookingFixture,
} from '@/testing/booking-fixture'
import { CALENDAR_DELETE_JOB } from '@/use-cases/calendar-sync-jobs'
import { makeCancelBooking } from '@/use-cases/cancel-booking'
import { makeConfirmBooking } from '@/use-cases/confirm-booking'
import { makeCreateBookingForClient } from '@/use-cases/create-booking-for-client'
import { makeDeclineBooking } from '@/use-cases/decline-booking'
import { makeListBookingClients } from '@/use-cases/list-booking-clients'
import { makeListBookings } from '@/use-cases/list-bookings'
import { makeMarkBookingOutcome } from '@/use-cases/mark-booking-outcome'
import { makeRequestBooking } from '@/use-cases/request-booking'
import { makeRescheduleBooking } from '@/use-cases/reschedule-booking'
import { makeUpsertBookingClientForHost } from '@/use-cases/upsert-booking-client'

const TUESDAY_10 = '2026-06-23T10:00:00.000Z'
const RANGE = {
  from: '2026-06-22T00:00:00.000Z',
  to: '2026-06-30T00:00:00.000Z',
}

async function setup(serviceSettings = {}) {
  const fx = bookingFixture()
  await fx.seedPage(serviceSettings)
  await fx.seedClient()
  const bookFor = makeCreateBookingForClient(fx)
  return {
    fx,
    bookFor,
    book: (startsAt = TUESDAY_10) =>
      bookFor(OWNER, { serviceId: SERVICE_ID, clientId: CLIENT_ID, startsAt }),
    list: makeListBookings(fx),
    confirm: makeConfirmBooking(fx),
    decline: makeDeclineBooking(fx),
    cancel: makeCancelBooking(fx),
    reschedule: makeRescheduleBooking(fx),
    outcome: makeMarkBookingOutcome(fx),
    listClients: makeListBookingClients(fx),
    upsertClient: makeUpsertBookingClientForHost(fx),
  }
}

const noticeKinds = (
  jobs: { type: string; payload: Record<string, unknown> }[],
) =>
  jobs
    .filter(job => job.type === BOOKING_NOTICE_JOB)
    .map(job => job.payload.kind)

describe('createBookingForClient', () => {
  it('books a known client, confirmed, with notice skipped', async () => {
    const { fx, bookFor } = await setup({ minNoticeMin: 48 * 60 })
    const view = await bookFor(
      OWNER,
      { serviceId: SERVICE_ID, clientId: CLIENT_ID, startsAt: TUESDAY_10 },
      'assistant',
    )
    expect(view).toMatchObject({
      status: 'confirmed',
      source: 'assistant',
      serviceName: 'Aula',
      client: { id: CLIENT_ID, name: 'João' },
    })
    expect(noticeKinds(fx.jobs)).toEqual(['confirmed'])
    const notice = fx.jobs.find(job => job.type === BOOKING_NOTICE_JOB)
    expect(notice?.payload.byClient).toBe(false)
  })

  it('refuses closed hours unless told to override them', async () => {
    const { book, bookFor } = await setup()
    await expect(book('2026-06-23T15:00:00.000Z')).rejects.toBeInstanceOf(
      SlotTakenError,
    )
    const forced = await bookFor(OWNER, {
      serviceId: SERVICE_ID,
      clientId: CLIENT_ID,
      startsAt: '2026-06-23T15:00:00.000Z',
      overrideAvailability: true,
    })
    expect(forced.startsAt).toBe('2026-06-23T15:00:00.000Z')
  })

  it('needs the host’s own active service and client', async () => {
    const { fx, book, bookFor } = await setup()
    await expect(
      bookFor(OWNER, {
        serviceId: SERVICE_ID,
        clientId: '77777777-7777-4777-8777-777777777777',
        startsAt: TUESDAY_10,
      }),
    ).rejects.toThrow('Client was not found')
    const service = await fx.services.findById(SERVICE_ID)
    service!.archive(at(TUESDAY_10))
    await fx.services.save(service!)
    await expect(book()).rejects.toThrow('Booking service was not found')
    await expect(
      bookFor(STRANGER, {
        serviceId: SERVICE_ID,
        clientId: CLIENT_ID,
        startsAt: TUESDAY_10,
      }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('listBookings', () => {
  it('lists the range with names, filtered by status', async () => {
    const { book, cancel, list } = await setup()
    const kept = await book()
    const dropped = await book('2026-06-23T11:00:00.000Z')
    await cancel(OWNER, dropped.id)
    const all = await list(OWNER, RANGE)
    expect(
      all.map(view => [view.status, view.serviceName, view.client?.name]),
    ).toEqual([
      ['confirmed', 'Aula', 'João'],
      ['cancelled', 'Aula', 'João'],
    ])
    const confirmed = await list(OWNER, { ...RANGE, status: ['confirmed'] })
    expect(confirmed.map(view => view.id)).toEqual([kept.id])
  })

  it('refuses an empty or oversized range and copes without a page', async () => {
    const { list } = await setup()
    await expect(
      list(OWNER, { from: RANGE.to, to: RANGE.from }),
    ).rejects.toBeInstanceOf(ValidationError)
    await expect(
      list(OWNER, { from: RANGE.from, to: '2028-01-01T00:00:00.000Z' }),
    ).rejects.toThrow('400 days')
    expect(await list(STRANGER, RANGE)).toEqual([])
  })
})

describe('host decisions', () => {
  it('confirms a pending booking and arms its reminder', async () => {
    const { fx, confirm } = await setup({ requiresApproval: true })
    const result = await makeRequestBooking(fx)('ana', {
      serviceId: SERVICE_ID,
      startsAt: TUESDAY_10,
      name: 'João',
      email: 'joao@mail.com',
    })
    fx.jobs.length = 0
    await confirm(OWNER, result.bookingId)
    const booking = await fx.bookings.findById(asEntityId(result.bookingId))
    expect(booking?.status).toBe('confirmed')
    expect(noticeKinds(fx.jobs)).toEqual(['confirmed'])
    expect(fx.jobs.map(job => job.type)).toContain(BOOKING_REMINDER_JOB)
  })

  it('declines and cancels, freeing the slot and the event', async () => {
    const { fx, book, decline, cancel } = await setup({
      requiresApproval: true,
    })
    const requested = await makeRequestBooking(fx)('ana', {
      serviceId: SERVICE_ID,
      startsAt: TUESDAY_10,
      name: 'João',
      email: 'joao@mail.com',
    })
    const [first] = await makeListBookings(fx)(OWNER, RANGE)
    expect(first?.id).toBe(requested.bookingId)
    const second = await book('2026-06-23T11:00:00.000Z')
    fx.jobs.length = 0
    await expect(decline(OWNER, second.id)).rejects.toThrow(
      'confirmed booking cannot become declined',
    )
    await decline(OWNER, first!.id, { reason: ' Busy ' })
    await cancel(OWNER, second.id)
    const declined = await fx.bookings.findById(asEntityId(first!.id))
    expect(declined?.toJSON()).toMatchObject({
      status: 'declined',
      cancelReason: 'Busy',
      calendarEventId: null,
    })
    expect(
      await fx.calendarEvents.findById(asEntityId(first!.calendarEventId!)),
    ).toBeNull()
    expect(noticeKinds(fx.jobs)).toEqual(['declined', 'cancelled'])
    await expect(book()).resolves.toMatchObject({ status: 'confirmed' })
  })

  it('cancels even when the event was already removed', async () => {
    const { fx, book, cancel } = await setup()
    const view = await book()
    await fx.calendarEvents.delete(asEntityId(view.calendarEventId!))
    await cancel(OWNER, view.id)
    expect(fx.jobs.map(job => job.type)).not.toContain(CALENDAR_DELETE_JOB)
  })

  it('hides another host’s booking', async () => {
    const { book, cancel } = await setup()
    const view = await book()
    await expect(cancel(STRANGER, view.id)).rejects.toThrow(
      'Booking was not found',
    )
  })

  it('records the outcome once the booking started', async () => {
    const { fx, book, outcome } = await setup()
    const view = await book()
    await expect(
      outcome(OWNER, view.id, { outcome: 'completed' }),
    ).rejects.toThrow('not started')
    fx.setNow(at('2026-06-23T11:30:00.000Z'))
    await outcome(OWNER, view.id, { outcome: 'no_show' })
    const booking = await fx.bookings.findById(asEntityId(view.id))
    expect(booking?.status).toBe('no_show')
  })
})

describe('rescheduleBooking', () => {
  it('moves the booking and its event in place', async () => {
    const { fx, book, reschedule } = await setup()
    const view = await book()
    fx.jobs.length = 0
    const moved = await reschedule(OWNER, view.id, {
      startsAt: '2026-06-23T10:30:00.000Z',
    })
    expect(moved).toMatchObject({
      id: view.id,
      startsAt: '2026-06-23T10:30:00.000Z',
      endsAt: '2026-06-23T11:30:00.000Z',
      client: { name: 'João' },
    })
    const event = await fx.calendarEvents.findById(
      asEntityId(view.calendarEventId!),
    )
    expect(event?.startsAt).toEqual(at('2026-06-23T10:30:00.000Z'))
    expect(noticeKinds(fx.jobs)).toEqual(['rescheduled'])
  })

  it('refuses a taken or closed time unless overridden', async () => {
    const { book, reschedule } = await setup()
    const view = await book()
    await book('2026-06-23T11:00:00.000Z')
    await expect(
      reschedule(OWNER, view.id, { startsAt: '2026-06-23T10:30:00.000Z' }),
    ).rejects.toBeInstanceOf(SlotTakenError)
    const forced = await reschedule(OWNER, view.id, {
      startsAt: '2026-06-23T18:00:00.000Z',
      overrideAvailability: true,
    })
    expect(forced.startsAt).toBe('2026-06-23T18:00:00.000Z')
  })

  it('unlinks an event that disappeared', async () => {
    const { fx, book, reschedule } = await setup()
    const view = await book()
    await fx.calendarEvents.delete(asEntityId(view.calendarEventId!))
    const moved = await reschedule(OWNER, view.id, {
      startsAt: '2026-06-23T09:00:00.000Z',
    })
    expect(moved.calendarEventId).toBeNull()
  })
})

describe('booking clients', () => {
  it('searches by name, email or phone digits', async () => {
    const { listClients, upsertClient } = await setup()
    await upsertClient(OWNER, { name: 'Maria Souza', email: 'maria@mail.com' })
    const names = async (search?: string) =>
      (await listClients(OWNER, { search })).map(client => client.name)
    expect(await names()).toEqual(['João', 'Maria Souza'])
    expect(await names('mar')).toEqual(['Maria Souza'])
    expect(await names('joao@')).toEqual(['João'])
    expect(await names('98765')).toEqual(['João'])
    expect(await names('98')).toEqual([])
  })

  it('merges a repeat by phone and edits by id', async () => {
    const { fx, upsertClient } = await setup()
    const merged = await upsertClient(OWNER, {
      name: 'João P.',
      phone: '+5511987654321',
    })
    expect(merged).toMatchObject({ id: CLIENT_ID, email: 'joao@mail.com' })
    const edited = await upsertClient(
      OWNER,
      { name: 'João', email: 'novo@mail.com', notes: 'VIP' },
      CLIENT_ID,
    )
    expect(edited).toMatchObject({ email: 'novo@mail.com', phone: null })
    expect(await fx.clients.listByOwner(OWNER)).toHaveLength(1)
    await expect(
      upsertClient(STRANGER, { name: 'X', email: 'x@mail.com' }, CLIENT_ID),
    ).rejects.toThrow('Client was not found')
  })
})
