import { describe, expect, it } from 'vitest'
import { BookingClient, asEntityId } from '@lifedeck/domain'
import { BOOKING_NOTICE_JOB, BOOKING_REMINDER_JOB } from '@/shared/booking-jobs'
import {
  CLIENT_ID,
  OWNER,
  SERVICE_ID,
  at,
  bookingFixture,
} from '@/testing/booking-fixture'
import { makeCancelBooking } from '@/use-cases/cancel-booking'
import { makeCreateBookingForClient } from '@/use-cases/create-booking-for-client'
import { makeDeliverBookingNotice } from '@/use-cases/deliver-booking-notice'
import { makeDeliverBookingReminder } from '@/use-cases/deliver-booking-reminder'
import { makeRequestBooking } from '@/use-cases/request-booking'
import { makeRescheduleBooking } from '@/use-cases/reschedule-booking'

const TUESDAY_10 = '2026-06-23T10:00:00.000Z'

async function setup(serviceSettings = {}) {
  const fx = bookingFixture()
  await fx.seedPage(serviceSettings)
  const booked = await makeRequestBooking(fx)('ana', {
    serviceId: SERVICE_ID,
    startsAt: TUESDAY_10,
    name: 'João',
    email: 'joao@mail.com',
    timezone: 'America/Sao_Paulo',
  })
  const deliver = makeDeliverBookingNotice(fx)
  const remind = makeDeliverBookingReminder(fx)
  const payloadOf = (type: string) =>
    fx.jobs.filter(job => job.type === type).at(-1)!.payload
  return { fx, booked, deliver, remind, payloadOf }
}

describe('deliverBookingNotice', () => {
  it('emails the client with the manage link and alerts the host', async () => {
    const { fx, booked, deliver, payloadOf } = await setup()
    await deliver(payloadOf(BOOKING_NOTICE_JOB))
    expect(fx.emailSender.bookingNotices).toHaveLength(1)
    const [sent] = fx.emailSender.bookingNotices
    expect(sent).toMatchObject({
      to: 'joao@mail.com',
      locale: 'pt',
      notice: {
        kind: 'confirmed',
        bookingId: booked.bookingId,
        serviceName: 'Aula',
        hostName: 'Ana Lima',
        clientName: 'João',
        startsAt: at(TUESDAY_10),
        timeZone: 'America/Sao_Paulo',
        location: { kind: 'online-link', url: 'https://meet.test/ana' },
        manageUrl: `https://lifedeck.test/b/manage/signed.${booked.bookingId}`,
        reason: null,
      },
    })
    expect(sent!.notice.sequence).toBeGreaterThan(0)

    const [bell] = await fx.notifications.listByUser(OWNER, 10)
    expect(bell?.toJSON()).toMatchObject({
      type: 'booking-confirmed',
      data: {
        bookingId: booked.bookingId,
        clientName: 'João',
        serviceName: 'Aula',
        startsAt: TUESDAY_10,
        calendarStale: 'false',
      },
    })
  })

  it('stays quiet towards the host for the host’s own changes', async () => {
    const { fx, booked, deliver, payloadOf } = await setup()
    await makeCancelBooking(fx)(OWNER, booked.bookingId, { reason: 'Ill' })
    await deliver(payloadOf(BOOKING_NOTICE_JOB))
    const [sent] = fx.emailSender.bookingNotices
    expect(sent?.notice).toMatchObject({
      kind: 'cancelled',
      reason: 'Ill',
      manageUrl: null,
    })
    expect(await fx.notifications.listByUser(OWNER, 10)).toEqual([])
  })

  it('skips the email for a client without one, and a deleted booking', async () => {
    const { fx, deliver, payloadOf } = await setup()
    await fx.clients.save(
      BookingClient.create({
        id: CLIENT_ID,
        ownerId: OWNER,
        name: 'Zé',
        phone: '+5511900000000',
        now: at(TUESDAY_10),
      }),
    )
    await makeCreateBookingForClient(fx)(OWNER, {
      serviceId: SERVICE_ID,
      clientId: CLIENT_ID,
      startsAt: '2026-06-23T11:00:00.000Z',
    })
    await deliver(payloadOf(BOOKING_NOTICE_JOB))
    await deliver({
      bookingId: '77777777-7777-4777-8777-777777777777',
      kind: 'confirmed',
      byClient: true,
    })
    expect(fx.emailSender.bookingNotices).toEqual([])
    expect(await fx.notifications.listByUser(OWNER, 10)).toEqual([])
  })

  it('rejects a malformed payload', async () => {
    const { deliver } = await setup()
    await expect(deliver({ bookingId: 'x', kind: 'lost' })).rejects.toThrow()
  })
})

describe('deliverBookingReminder', () => {
  it('reminds the client a day before', async () => {
    const { fx, remind, payloadOf } = await setup()
    await remind(payloadOf(BOOKING_REMINDER_JOB))
    expect(fx.emailSender.bookingNotices.map(sent => sent.notice.kind)).toEqual(
      ['reminder'],
    )
  })

  it('drops a reminder for an older time or a released booking', async () => {
    const { fx, booked, remind, payloadOf } = await setup()
    const stale = payloadOf(BOOKING_REMINDER_JOB)
    await makeRescheduleBooking(fx)(OWNER, booked.bookingId, {
      startsAt: '2026-06-23T11:00:00.000Z',
    })
    await remind(stale)
    expect(fx.emailSender.bookingNotices).toEqual([])
    await makeCancelBooking(fx)(OWNER, booked.bookingId)
    await remind(payloadOf(BOOKING_REMINDER_JOB))
    expect(fx.emailSender.bookingNotices).toEqual([])
  })

  it('keys the reminder by booking and start', async () => {
    const { fx, booked } = await setup()
    const job = fx.jobs.find(entry => entry.type === BOOKING_REMINDER_JOB)
    expect(job).toMatchObject({
      runAt: at('2026-06-22T10:00:00.000Z'),
      dedupKey: `booking:${booked.bookingId}:1440:${TUESDAY_10}`,
    })
    const booking = await fx.bookings.findById(asEntityId(booked.bookingId))
    expect(booking?.status).toBe('confirmed')
  })
})
