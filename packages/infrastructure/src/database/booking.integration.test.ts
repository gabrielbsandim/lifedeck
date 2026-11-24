import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  Booking,
  BookingClient,
  BookingPage,
  BookingService,
  User,
  asEntityId,
} from '@lifedeck/domain'
import { SlotTakenError } from '@lifedeck/application'
import {
  PrismaAvailabilityRepository,
  PrismaBookingClientRepository,
  PrismaBookingPageRepository,
  PrismaBookingRepository,
  PrismaBookingServiceRepository,
} from '@/database/prisma-booking-repositories'
import { PrismaUserRepository } from '@/database/prisma-user-repository'

// Two clients, two connection pools: the race is real, not serialized by a
// single pool.
const prisma = new PrismaClient()
const rival = new PrismaClient()
const pages = new PrismaBookingPageRepository(prisma)
const services = new PrismaBookingServiceRepository(prisma)
const availability = new PrismaAvailabilityRepository(prisma)
const clients = new PrismaBookingClientRepository(prisma)
const bookings = new PrismaBookingRepository(prisma)
const rivalBookings = new PrismaBookingRepository(rival)

const id = (n: number) =>
  asEntityId(`3c000000-0000-4000-8000-${String(n).padStart(12, '0')}`)
const USER = id(1)
const PAGE = id(2)
const SERVICE = id(3)
const CLIENT = id(4)
const NOW = new Date('2026-06-20T12:00:00.000Z')
const at = (iso: string) => new Date(`2026-06-22T${iso}:00.000Z`)

function booking(n: number, start: string, end: string) {
  return Booking.create({
    id: id(n),
    ownerId: USER,
    serviceId: SERVICE,
    clientId: CLIENT,
    startsAt: at(start),
    endsAt: at(end),
    requiresApproval: false,
    source: 'public',
    now: NOW,
  })
}

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { id: USER } })
  await new PrismaUserRepository(prisma).save(
    User.createGuest({
      id: USER,
      displayName: 'Booking host',
      locale: 'pt',
      createdAt: NOW,
    }),
  )
  await pages.save(
    BookingPage.create({
      id: PAGE,
      ownerId: USER,
      slug: 'race-host',
      displayName: 'Race host',
      timezone: 'America/Sao_Paulo',
      locale: 'pt',
      now: NOW,
    }),
  )
  await services.save(
    BookingService.create({
      id: SERVICE,
      ownerId: USER,
      pageId: PAGE,
      name: 'Class',
      durationMin: 60,
      location: { kind: 'in-person', address: 'Rua A, 1' },
      position: 0,
      now: NOW,
    }),
  )
  await clients.save(
    BookingClient.create({
      id: CLIENT,
      ownerId: USER,
      name: 'João',
      phone: '+5511987654321',
      email: 'joao@mail.com',
      now: NOW,
    }),
  )
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: USER } })
  await prisma.$disconnect()
  await rival.$disconnect()
})

describe('bookings (integration)', () => {
  it('lets exactly one of two racing bookings for one slot win', async () => {
    const results = await Promise.allSettled([
      bookings.save(booking(10, '13:00', '14:00')),
      rivalBookings.save(booking(11, '13:30', '14:30')),
    ])
    const won = results.filter(r => r.status === 'fulfilled')
    const lost = results.filter(r => r.status === 'rejected')
    expect(won).toHaveLength(1)
    expect(lost).toHaveLength(1)
    expect((lost[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      SlotTakenError,
    )
    const stored = await bookings.listByOwnerInRange(
      USER,
      at('00:00'),
      at('23:59'),
    )
    expect(stored).toHaveLength(1)
  })

  it('frees the slot once a booking stops holding it', async () => {
    const [held] = await bookings.listByOwnerInRange(
      USER,
      at('00:00'),
      at('23:59'),
    )
    held!.cancel('Sick', NOW)
    await bookings.save(held!)
    await bookings.save(booking(12, '13:00', '14:00'))
    // Touching ends do not overlap: tsrange is half open.
    await bookings.save(booking(13, '14:00', '15:00'))
    const statuses = (
      await bookings.listByOwnerInRange(USER, at('00:00'), at('23:59'))
    ).map(b => b.status)
    expect(statuses.sort()).toEqual(['cancelled', 'confirmed', 'confirmed'])
    expect((await bookings.findById(id(13)))?.startsAt).toEqual(at('14:00'))
  })

  it('stores weekly hours, overrides and client lookups', async () => {
    await availability.replaceWeekly(PAGE, [
      { weekday: 1, startMinute: 540, endMinute: 720 },
      { weekday: 3, startMinute: 600, endMinute: 660 },
    ])
    await availability.replaceWeekly(PAGE, [
      { weekday: 2, startMinute: 540, endMinute: 600 },
    ])
    expect(await availability.getWeekly(PAGE)).toEqual([
      { weekday: 2, startMinute: 540, endMinute: 600 },
    ])
    await availability.saveOverride(PAGE, { date: '2026-12-24', windows: [] })
    await availability.saveOverride(PAGE, {
      date: '2026-12-24',
      windows: [{ startMinute: 480, endMinute: 720 }],
    })
    await availability.saveOverride(PAGE, { date: '2026-12-25', windows: [] })
    expect(
      await availability.listOverrides(PAGE, '2026-12-24', '2026-12-24'),
    ).toEqual([
      { date: '2026-12-24', windows: [{ startMinute: 480, endMinute: 720 }] },
    ])
    await availability.deleteOverride(PAGE, '2026-12-25')
    expect(
      await availability.listOverrides(PAGE, '2026-12-01', '2026-12-31'),
    ).toHaveLength(1)

    expect((await clients.findByPhone(USER, '+5511987654321'))?.id).toBe(CLIENT)
    expect((await clients.findByEmail(USER, 'joao@mail.com'))?.id).toBe(CLIENT)
    expect(await clients.listByOwner(USER)).toHaveLength(1)
    expect((await pages.findBySlug('race-host'))?.id).toBe(PAGE)
    expect((await pages.findByOwner(USER))?.slug).toBe('race-host')
    expect((await services.listByPage(PAGE)).map(s => s.name)).toEqual([
      'Class',
    ])
  })

  it('removes every booking row when the host is deleted', async () => {
    await prisma.user.delete({ where: { id: USER } })
    expect(await prisma.booking.count({ where: { ownerId: USER } })).toBe(0)
    expect(await prisma.bookingPage.count({ where: { ownerId: USER } })).toBe(0)
    expect(
      await prisma.availabilityRule.count({ where: { pageId: PAGE } }),
    ).toBe(0)
  })
})
