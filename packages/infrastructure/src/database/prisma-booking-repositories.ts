import type {
  AvailabilityOverride,
  Booking,
  BookingClient,
  BookingPage,
  BookingService,
  EntityId,
  WeeklyWindow,
} from '@lifedeck/domain'
import {
  SlotTakenError,
  type AvailabilityRepository,
  type BookingClientRepository,
  type BookingPageRepository,
  type BookingRepository,
  type BookingServiceRepository,
} from '@lifedeck/application'
import type { PrismaClient } from '@prisma/client'
import {
  isSlotTakenViolation,
  toBookingClientRecord,
  toBookingPageRecord,
  toBookingRecord,
  toBookingServiceRecord,
  toCivilDate,
  toDomainBooking,
  toDomainBookingClient,
  toDomainBookingPage,
  toDomainBookingService,
  toDomainOverride,
} from '@/database/booking-records'

export class PrismaBookingPageRepository implements BookingPageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(page: BookingPage): Promise<void> {
    const { id, ownerId, createdAt, ...rest } = toBookingPageRecord(page)
    await this.prisma.bookingPage.upsert({
      where: { id },
      create: { id, ownerId, createdAt, ...rest },
      update: rest,
    })
  }

  async findById(id: EntityId): Promise<BookingPage | null> {
    const row = await this.prisma.bookingPage.findUnique({ where: { id } })
    return row ? toDomainBookingPage(row) : null
  }

  async findByOwner(ownerId: EntityId): Promise<BookingPage | null> {
    const row = await this.prisma.bookingPage.findUnique({ where: { ownerId } })
    return row ? toDomainBookingPage(row) : null
  }

  async findBySlug(slug: string): Promise<BookingPage | null> {
    const row = await this.prisma.bookingPage.findUnique({ where: { slug } })
    return row ? toDomainBookingPage(row) : null
  }
}

export class PrismaBookingServiceRepository
  implements BookingServiceRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async save(service: BookingService): Promise<void> {
    const { id, ownerId, pageId, createdAt, ...rest } =
      toBookingServiceRecord(service)
    await this.prisma.bookingService.upsert({
      where: { id },
      create: { id, ownerId, pageId, createdAt, ...rest },
      update: rest,
    })
  }

  async findById(id: EntityId): Promise<BookingService | null> {
    const row = await this.prisma.bookingService.findUnique({ where: { id } })
    return row ? toDomainBookingService(row) : null
  }

  async listByPage(pageId: EntityId): Promise<BookingService[]> {
    const rows = await this.prisma.bookingService.findMany({
      where: { pageId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    })
    return rows.map(toDomainBookingService)
  }
}

export class PrismaAvailabilityRepository implements AvailabilityRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getWeekly(pageId: EntityId): Promise<WeeklyWindow[]> {
    return this.prisma.availabilityRule.findMany({
      where: { pageId },
      select: { weekday: true, startMinute: true, endMinute: true },
      orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
    })
  }

  // Two statements: callers run it inside a UnitOfWork so a reader never
  // sees the week empty.
  async replaceWeekly(pageId: EntityId, windows: WeeklyWindow[]) {
    await this.prisma.availabilityRule.deleteMany({ where: { pageId } })
    await this.prisma.availabilityRule.createMany({
      data: windows.map(window => ({ pageId, ...window })),
    })
  }

  async listOverrides(
    pageId: EntityId,
    fromDate: string,
    toDate: string,
  ): Promise<AvailabilityOverride[]> {
    const rows = await this.prisma.availabilityOverride.findMany({
      where: {
        pageId,
        date: { gte: toCivilDate(fromDate), lte: toCivilDate(toDate) },
      },
      orderBy: { date: 'asc' },
    })
    return rows.map(toDomainOverride)
  }

  async saveOverride(pageId: EntityId, override: AvailabilityOverride) {
    const date = toCivilDate(override.date)
    await this.prisma.availabilityOverride.upsert({
      where: { pageId_date: { pageId, date } },
      create: { pageId, date, windows: override.windows },
      update: { windows: override.windows },
    })
  }

  async deleteOverride(pageId: EntityId, date: string): Promise<void> {
    await this.prisma.availabilityOverride.deleteMany({
      where: { pageId, date: toCivilDate(date) },
    })
  }
}

export class PrismaBookingClientRepository implements BookingClientRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(client: BookingClient): Promise<void> {
    const { id, ownerId, createdAt, ...rest } = toBookingClientRecord(client)
    await this.prisma.bookingClient.upsert({
      where: { id },
      create: { id, ownerId, createdAt, ...rest },
      update: rest,
    })
  }

  async findById(id: EntityId): Promise<BookingClient | null> {
    const row = await this.prisma.bookingClient.findUnique({ where: { id } })
    return row ? toDomainBookingClient(row) : null
  }

  async findByPhone(ownerId: EntityId, phone: string) {
    const row = await this.prisma.bookingClient.findUnique({
      where: { ownerId_phone: { ownerId, phone } },
    })
    return row ? toDomainBookingClient(row) : null
  }

  async findByEmail(ownerId: EntityId, email: string) {
    const row = await this.prisma.bookingClient.findFirst({
      where: { ownerId, email },
      orderBy: { createdAt: 'asc' },
    })
    return row ? toDomainBookingClient(row) : null
  }

  async listByOwner(ownerId: EntityId): Promise<BookingClient[]> {
    const rows = await this.prisma.bookingClient.findMany({
      where: { ownerId },
      orderBy: { name: 'asc' },
    })
    return rows.map(toDomainBookingClient)
  }
}

export class PrismaBookingRepository implements BookingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(booking: Booking): Promise<void> {
    const { id, ownerId, serviceId, clientId, createdAt, source, ...rest } =
      toBookingRecord(booking)
    try {
      await this.prisma.booking.upsert({
        where: { id },
        create: {
          id,
          ownerId,
          serviceId,
          clientId,
          createdAt,
          source,
          ...rest,
        },
        update: rest,
      })
    } catch (error) {
      if (isSlotTakenViolation(error)) {
        throw new SlotTakenError()
      }
      throw error
    }
  }

  async findById(id: EntityId): Promise<Booking | null> {
    const row = await this.prisma.booking.findUnique({ where: { id } })
    return row ? toDomainBooking(row) : null
  }

  async listByOwnerInRange(
    ownerId: EntityId,
    from: Date,
    to: Date,
  ): Promise<Booking[]> {
    const rows = await this.prisma.booking.findMany({
      where: { ownerId, startsAt: { lt: to }, endsAt: { gt: from } },
      orderBy: { startsAt: 'asc' },
    })
    return rows.map(toDomainBooking)
  }

  async findByCalendarEventId(
    calendarEventId: EntityId,
  ): Promise<Booking | null> {
    const row = await this.prisma.booking.findFirst({
      where: { calendarEventId },
    })
    return row ? toDomainBooking(row) : null
  }
}
