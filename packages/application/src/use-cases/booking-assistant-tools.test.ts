import { describe, expect, it } from 'vitest'
import { BookingClient, BookingService, asEntityId } from '@lifedeck/domain'
import { NotFoundError, SlotTakenError } from '@/errors/use-case-error'
import {
  clientNameMatches,
  makeBookingAssistantTools,
} from '@/shared/booking-assistant-tools'
import {
  APP_URL,
  BOOKING_NOW,
  CLIENT_ID,
  OWNER,
  SERVICE_ID,
  at,
  bookingFixture,
  type BookingFixture,
} from '@/testing/booking-fixture'
import { makeCancelBooking } from '@/use-cases/cancel-booking'
import { makeCreateBookingForClient } from '@/use-cases/create-booking-for-client'
import { makeGetBookingSetup } from '@/use-cases/get-booking-setup'
import { makeListBookingClients } from '@/use-cases/list-booking-clients'
import { makeListBookings } from '@/use-cases/list-bookings'
import { makeListHostBookingSlots } from '@/use-cases/list-host-booking-slots'
import { makeRescheduleBooking } from '@/use-cases/reschedule-booking'
import { makeUpsertBookingClientForHost } from '@/use-cases/upsert-booking-client'

const HOST = OWNER as string
const TUESDAY_10 = '2026-06-23T10:00:00.000Z'

function toolsFor(fx: BookingFixture) {
  return makeBookingAssistantTools({
    users: fx.users,
    clock: fx.clock,
    appUrl: APP_URL,
    getBookingSetup: makeGetBookingSetup(fx),
    listBookingClients: makeListBookingClients(fx),
    upsertBookingClient: makeUpsertBookingClientForHost(fx),
    listHostBookingSlots: makeListHostBookingSlots(fx),
    listBookings: makeListBookings(fx),
    createBookingForClient: makeCreateBookingForClient(fx),
    cancelBooking: makeCancelBooking(fx),
    rescheduleBooking: makeRescheduleBooking(fx),
  })
}

async function seeded() {
  const fx = bookingFixture()
  await fx.seedPage()
  await fx.seedClient()
  return { fx, tools: toolsFor(fx) }
}

async function addNamed(fx: BookingFixture, id: string, name: string) {
  await fx.clients.save(
    BookingClient.create({
      id: asEntityId(id),
      ownerId: OWNER,
      name,
      email: `${id.slice(0, 4)}@mail.com`,
      phone: null,
      now: BOOKING_NOW,
    }),
  )
}

describe('clientNameMatches', () => {
  it('matches word prefixes and ignores accents', () => {
    expect(clientNameMatches('joao', 'João Silva')).toBe(true)
    expect(clientNameMatches('Silva', 'João Silva')).toBe(true)
    expect(clientNameMatches('joão s', 'João Silva')).toBe(true)
    expect(clientNameMatches('joana', 'João Silva')).toBe(false)
    expect(clientNameMatches('  ', 'João Silva')).toBe(false)
  })
})

describe('booking assistant: look up before create', () => {
  it('returns every client an ambiguous name could mean', async () => {
    const { fx, tools } = await seeded()
    await addNamed(fx, '66666666-6666-4666-8666-666666666666', 'João Pedro')
    await addNamed(fx, '77777777-7777-4777-8777-777777777777', 'Maria')

    const { clients } = await tools.findClient(HOST, 'joao')

    expect(clients.map(client => client.name).sort()).toEqual([
      'João',
      'João Pedro',
    ])
    expect((await tools.findClient(HOST, 'joao@mail.com')).clients).toEqual([
      expect.objectContaining({ id: CLIENT_ID }),
    ])
    expect((await tools.findClient(HOST, '98765')).clients).toHaveLength(1)
  })

  it('refuses to add a client whose name already exists', async () => {
    const { fx, tools } = await seeded()

    const refused = await tools.addClient(HOST, { name: 'João' })
    expect(refused).toMatchObject({ added: false, id: null })
    expect(refused.matches.map(client => client.id)).toEqual([CLIENT_ID])
    expect(await fx.clients.listByOwner(OWNER)).toHaveLength(1)

    const confirmed = await tools.addClient(HOST, {
      name: 'João',
      email: 'outro.joao@mail.com',
      confirmedNew: true,
    })
    expect(confirmed).toMatchObject({ added: true, matches: [] })
    expect(await fx.clients.listByOwner(OWNER)).toHaveLength(2)

    const fresh = await tools.addClient(HOST, {
      name: 'Bia',
      phone: '+5511912345678',
    })
    expect(fresh).toMatchObject({ added: true, name: 'Bia' })
  })
})

describe('booking assistant: slots and booking', () => {
  it('lists host slots in the user zone and picks the only service', async () => {
    const { fx, tools } = await seeded()
    fx.setNow(at('2026-06-22T10:30:00.000Z'))

    const result = await tools.listBookingSlots(HOST, {})

    expect(result.serviceId).toBe(SERVICE_ID)
    expect(result.services).toEqual([
      { id: SERVICE_ID, name: 'Aula', durationMin: 60 },
    ])
    expect(result.slots[0]).toEqual({
      startsAt: '2026-06-22T10:30:00+00:00',
      endsAt: '2026-06-22T11:30:00+00:00',
    })
  })

  it('asks for the service when the host offers several', async () => {
    const { fx, tools } = await seeded()
    const service = await fx.services.findById(SERVICE_ID)
    await fx.services.save(
      BookingService.create({
        ...service!.toJSON(),
        id: asEntityId('88888888-8888-4888-8888-888888888888'),
        name: 'Avaliação',
        position: 1,
        now: BOOKING_NOW,
      }),
    )

    const result = await tools.listBookingSlots(HOST, {})
    expect(result).toMatchObject({ serviceId: null, slots: [] })
    expect(result.services).toHaveLength(2)

    const windowed = await tools.listBookingSlots(HOST, {
      serviceId: SERVICE_ID,
      from: '2026-06-23T09:00:00+00:00',
      to: '2026-06-23T12:00:00+00:00',
    })
    expect(windowed.slots).toHaveLength(5)
  })

  it('books by client id and moves instead of booking twice', async () => {
    const { fx, tools } = await seeded()

    const booked = await tools.bookForClient(HOST, {
      clientId: CLIENT_ID,
      serviceId: SERVICE_ID,
      startsAt: TUESDAY_10,
      note: 'primeira aula',
    })
    expect(booked).toMatchObject({
      booked: true,
      title: 'Aula · João',
      clientName: 'João',
      startsAt: '2026-06-23T10:00:00+00:00',
      status: 'confirmed',
    })
    const bookingId = booked.booked ? booked.id : ''
    expect(
      (await fx.bookings.findById(asEntityId(bookingId)))?.toJSON().source,
    ).toBe('assistant')

    const second = await tools.bookForClient(HOST, {
      clientId: CLIENT_ID,
      serviceId: SERVICE_ID,
      startsAt: '2026-06-29T09:00:00.000Z',
    })
    expect(second.booked).toBe(false)
    expect(second.existing.map(item => item.id)).toEqual([bookingId])

    const moved = await tools.rescheduleBooking(HOST, {
      bookingId,
      startsAt: '2026-06-29T09:00:00+00:00',
    })
    expect(moved).toMatchObject({
      ok: true,
      id: bookingId,
      startsAt: '2026-06-29T09:00:00+00:00',
    })
    const { bookings } = await tools.listMyBookings(HOST, {})
    expect(bookings.map(item => item.id)).toEqual([bookingId])
  })

  it('books a further session a week out, or nearer when told to', async () => {
    const { tools } = await seeded()
    const first = { clientId: CLIENT_ID, serviceId: SERVICE_ID }
    await tools.bookForClient(HOST, { ...first, startsAt: TUESDAY_10 })

    const weekly = await tools.bookForClient(HOST, {
      ...first,
      startsAt: '2026-06-30T10:00:00.000Z',
    })
    expect(weekly.booked).toBe(true)

    const extra = await tools.bookForClient(HOST, {
      ...first,
      startsAt: '2026-06-22T09:00:00.000Z',
      alsoKeepExisting: true,
    })
    expect(extra.booked).toBe(true)
  })

  it('ignores past sessions when checking for a duplicate', async () => {
    const { fx, tools } = await seeded()
    const first = { clientId: CLIENT_ID, serviceId: SERVICE_ID }
    await tools.bookForClient(HOST, { ...first, startsAt: TUESDAY_10 })
    fx.setNow(at('2026-06-24T12:00:00.000Z'))

    const next = await tools.bookForClient(HOST, {
      ...first,
      startsAt: '2026-06-29T10:00:00.000Z',
    })
    expect(next.booked).toBe(true)
  })

  it('refuses a slot that is taken', async () => {
    const { fx, tools } = await seeded()
    await fx.seedEvent('2026-06-23T10:00:00.000Z', '2026-06-23T11:00:00.000Z')
    await expect(
      tools.bookForClient(HOST, {
        clientId: CLIENT_ID,
        serviceId: SERVICE_ID,
        startsAt: TUESDAY_10,
      }),
    ).rejects.toBeInstanceOf(SlotTakenError)
  })
})

describe('booking assistant: managing bookings', () => {
  it('lists, filters by client and cancels', async () => {
    const { fx, tools } = await seeded()
    await addNamed(fx, '66666666-6666-4666-8666-666666666666', 'Bia')
    const base = { serviceId: SERVICE_ID }
    const joao = await tools.bookForClient(HOST, {
      ...base,
      clientId: CLIENT_ID,
      startsAt: TUESDAY_10,
    })
    await tools.bookForClient(HOST, {
      ...base,
      clientId: '66666666-6666-4666-8666-666666666666',
      startsAt: '2026-06-23T11:00:00.000Z',
    })

    const all = await tools.listMyBookings(HOST, {
      from: '2026-06-23T00:00:00+00:00',
      to: '2026-06-24T00:00:00+00:00',
    })
    expect(all.bookings).toHaveLength(2)
    const onlyJoao = await tools.listMyBookings(HOST, { clientId: CLIENT_ID })
    expect(onlyJoao.bookings.map(item => item.clientName)).toEqual(['João'])

    const id = joao.booked ? joao.id : ''
    expect(
      await tools.cancelBooking(HOST, { bookingId: id, reason: 'doente' }),
    ).toEqual({ ok: true })
    expect((await tools.listMyBookings(HOST, {})).bookings).toHaveLength(1)
    const closed = await tools.listMyBookings(HOST, { includeClosed: true })
    expect(closed.bookings.map(item => item.status).sort()).toEqual([
      'cancelled',
      'confirmed',
    ])
  })

  it('shares the page link and one link per service', async () => {
    const { tools } = await seeded()
    expect(await tools.shareBookingLink(HOST)).toEqual({
      url: 'https://lifedeck.test/b/ana',
      active: true,
      services: [
        { name: 'Aula', url: `https://lifedeck.test/b/ana/${SERVICE_ID}` },
      ],
    })
  })

  it('reports a missing page instead of inventing a link', async () => {
    const fx = bookingFixture()
    await fx.seedOwner()
    const tools = toolsFor(fx)
    await expect(tools.shareBookingLink(HOST)).rejects.toBeInstanceOf(
      NotFoundError,
    )
    await expect(tools.listBookingSlots(HOST, {})).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })

  it('falls back to the default zone for an unknown user', async () => {
    const { fx } = await seeded()
    const tools = toolsFor({
      ...fx,
      users: { findById: async () => null },
    } as unknown as BookingFixture)
    const { bookings } = await tools.listMyBookings(HOST, {})
    expect(bookings).toEqual([])
  })
})

describe('host slots use case', () => {
  it('skips an archived service and an empty range', async () => {
    const { fx } = await seeded()
    const list = makeListHostBookingSlots(fx)
    expect(
      await list(HOST, {
        serviceId: SERVICE_ID,
        from: '2026-06-23T12:00:00.000Z',
        to: '2026-06-23T12:00:00.000Z',
      }),
    ).toEqual([])
    const service = await fx.services.findById(SERVICE_ID)
    service!.archive(BOOKING_NOW)
    await fx.services.save(service!)
    await expect(
      list(HOST, {
        serviceId: SERVICE_ID,
        from: '2026-06-23T09:00:00.000Z',
        to: '2026-06-23T12:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})
