import type {
  CalendarEvent,
  CalendarEventSource,
  EntityId,
  RecurrenceRule,
} from '@lifedeck/domain'
import type { CalendarEventRepository } from '@lifedeck/application'
import { Prisma, type PrismaClient } from '@prisma/client'
import {
  toCalendarEventRecord,
  toDomainCalendarEvent,
  type CalendarEventRecord,
} from '@/database/calendar-event-record'

function fromPrisma(record: {
  id: string
  ownerId: string
  title: string
  description: string | null
  location: string | null
  startsAt: Date
  endsAt: Date
  allDay: boolean
  reminders: number[]
  recurrence: unknown
  source: string
  connectionId: string | null
  externalId: string | null
  etag: string | null
  syncedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): CalendarEventRecord {
  return {
    id: record.id,
    ownerId: record.ownerId,
    title: record.title,
    description: record.description,
    location: record.location,
    startsAt: record.startsAt,
    endsAt: record.endsAt,
    allDay: record.allDay,
    reminders: record.reminders,
    recurrence: (record.recurrence as RecurrenceRule | null) ?? null,
    source: record.source as CalendarEventSource,
    connectionId: record.connectionId,
    externalId: record.externalId,
    etag: record.etag,
    syncedAt: record.syncedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

export class PrismaCalendarEventRepository implements CalendarEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(event: CalendarEvent): Promise<void> {
    const record = toCalendarEventRecord(event)
    const recurrence =
      record.recurrence === null
        ? Prisma.DbNull
        : (record.recurrence as unknown as Prisma.InputJsonValue)
    await this.prisma.calendarEvent.upsert({
      where: { id: record.id },
      create: {
        id: record.id,
        ownerId: record.ownerId,
        title: record.title,
        description: record.description,
        location: record.location,
        startsAt: record.startsAt,
        endsAt: record.endsAt,
        allDay: record.allDay,
        reminders: record.reminders,
        recurrence,
        source: record.source,
        connectionId: record.connectionId,
        externalId: record.externalId,
        etag: record.etag,
        syncedAt: record.syncedAt,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
      update: {
        title: record.title,
        description: record.description,
        location: record.location,
        startsAt: record.startsAt,
        endsAt: record.endsAt,
        allDay: record.allDay,
        reminders: { set: record.reminders },
        recurrence,
        source: record.source,
        connectionId: record.connectionId,
        externalId: record.externalId,
        etag: record.etag,
        syncedAt: record.syncedAt,
        updatedAt: record.updatedAt,
      },
    })
  }

  async findById(id: EntityId): Promise<CalendarEvent | null> {
    const row = await this.prisma.calendarEvent.findUnique({
      where: { id: id as string },
    })
    return row ? toDomainCalendarEvent(fromPrisma(row)) : null
  }

  async findByExternalId(
    ownerId: EntityId,
    externalId: string,
    connectionId?: EntityId,
  ): Promise<CalendarEvent | null> {
    const row = await this.prisma.calendarEvent.findFirst({
      where: {
        ownerId: ownerId as string,
        externalId,
        ...(connectionId ? { connectionId: connectionId as string } : {}),
      },
    })
    return row ? toDomainCalendarEvent(fromPrisma(row)) : null
  }

  async listByOwnerInRange(
    ownerId: EntityId,
    from: Date,
    to: Date,
  ): Promise<CalendarEvent[]> {
    const rows = await this.prisma.calendarEvent.findMany({
      where: {
        ownerId: ownerId as string,
        startsAt: { lte: to },
        endsAt: { gte: from },
      },
      orderBy: { startsAt: 'asc' },
    })
    return rows.map(row => toDomainCalendarEvent(fromPrisma(row)))
  }

  async listByOwner(ownerId: EntityId): Promise<CalendarEvent[]> {
    const rows = await this.prisma.calendarEvent.findMany({
      where: { ownerId: ownerId as string },
      orderBy: { startsAt: 'asc' },
    })
    return rows.map(row => toDomainCalendarEvent(fromPrisma(row)))
  }

  async delete(id: EntityId): Promise<void> {
    await this.prisma.calendarEvent.deleteMany({ where: { id: id as string } })
  }

  async deleteByConnection(
    ownerId: EntityId,
    connectionId: EntityId,
  ): Promise<void> {
    await this.prisma.calendarEvent.deleteMany({
      where: {
        ownerId: ownerId as string,
        connectionId: connectionId as string,
      },
    })
  }
}
