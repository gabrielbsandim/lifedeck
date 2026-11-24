import { describe, expect, it } from 'vitest'
import { asEntityId } from '@lifedeck/domain'
import {
  ForbiddenError,
  NotFoundError,
  SlotTakenError,
} from '@/errors/use-case-error'
import { BOOKING_NOTICE_JOB } from '@/shared/booking-jobs'
import { SERVICE_ID, at, bookingFixture } from '@/testing/booking-fixture'
import { makeCancelBookingByToken } from '@/use-cases/cancel-booking-by-token'
import { makeGetManagedBooking } from '@/use-cases/get-managed-booking'
import { makeRequestBooking } from '@/use-cases/request-booking'
import { makeRescheduleBookingByToken } from '@/use-cases/reschedule-booking-by-token'

async function setup() {
  const fx = bookingFixture()
  const { page } = await fx.seedPage()
  page.update({ cancelNoticeMin: 60 }, at('2026-06-21T12:00:00.000Z'))
  await fx.pages.save(page)
  const request = makeRequestBooking(fx)
  const booked = await request('ana', {
    serviceId: SERVICE_ID,
    startsAt: '2026-06-23T10:00:00.000Z',
    name: 'João',
    email: 'joao@mail.com',
    timezone: 'Europe/Lisbon',
  })
  fx.jobs.length = 0
  return {
    fx,
    request,
    token: booked.manageToken,
    bookingId: booked.bookingId,
    get: makeGetManagedBooking(fx),
    cancel: makeCancelBookingByToken(fx),
    reschedule: makeRescheduleBookingByToken(fx),
  }
}

describe('managing a booking by its link', () => {
  it('shows the booking with what the client needs', async () => {
    const { get, token } = await setup()
    expect(await get(token)).toEqual({
      status: 'confirmed',
      startsAt: '2026-06-23T10:00:00.000Z',
      endsAt: '2026-06-23T11:00:00.000Z',
      serviceId: SERVICE_ID,
      serviceName: 'Aula',
      durationMin: 60,
      hostName: 'Ana Lima',
      slug: 'ana',
      pageTimezone: 'UTC',
      clientName: 'João',
      clientTimezone: 'Europe/Lisbon',
      location: { kind: 'online-link', url: 'https://meet.test/ana' },
      canChange: true,
    })
  })

  it('rejects a forged token or a booking that no longer exists', async () => {
    const { fx, get } = await setup()
    await expect(get('forged')).rejects.toBeInstanceOf(NotFoundError)
    await expect(
      get(fx.tokens.sign('77777777-7777-4777-8777-777777777777')),
    ).rejects.toThrow('Booking was not found')
  })

  it('cancels and tells the host', async () => {
    const { fx, cancel, token, bookingId } = await setup()
    const view = await cancel(token, { reason: 'Sick' })
    expect(view).toMatchObject({ status: 'cancelled', canChange: false })
    const notice = fx.jobs.find(job => job.type === BOOKING_NOTICE_JOB)
    expect(notice?.payload).toMatchObject({
      bookingId,
      kind: 'cancelled',
      byClient: true,
    })
    await expect(cancel(token)).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('stops changes once inside the cancellation notice', async () => {
    const { fx, cancel, reschedule, get, token } = await setup()
    fx.setNow(at('2026-06-23T09:30:00.000Z'))
    expect((await get(token)).canChange).toBe(false)
    await expect(cancel(token)).rejects.toBeInstanceOf(ForbiddenError)
    await expect(
      reschedule(token, { startsAt: '2026-06-23T11:00:00.000Z' }),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('moves to another offered slot, its own time excluded', async () => {
    const { fx, reschedule, token, bookingId } = await setup()
    const view = await reschedule(token, {
      startsAt: '2026-06-23T10:30:00.000Z',
    })
    expect(view.startsAt).toBe('2026-06-23T10:30:00.000Z')
    const booking = await fx.bookings.findById(asEntityId(bookingId))
    expect(booking?.endsAt).toEqual(at('2026-06-23T11:30:00.000Z'))
    const notice = fx.jobs.find(job => job.type === BOOKING_NOTICE_JOB)
    expect(notice?.payload).toMatchObject({
      kind: 'rescheduled',
      byClient: true,
    })
  })

  it('refuses a slot that is not offered', async () => {
    const { reschedule, token } = await setup()
    await expect(
      reschedule(token, { startsAt: '2026-06-23T13:00:00.000Z' }),
    ).rejects.toBeInstanceOf(SlotTakenError)
  })
})
