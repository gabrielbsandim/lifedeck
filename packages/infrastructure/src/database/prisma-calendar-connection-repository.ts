import type {
  CalendarConnection,
  CalendarProviderName,
  EntityId,
} from '@lifedeck/domain'
import type { CalendarConnectionRepository } from '@lifedeck/application'
import type { PrismaClient } from '@prisma/client'
import {
  toCalendarConnectionRecord,
  toDomainCalendarConnection,
  type CalendarConnectionRecord,
} from '@/database/calendar-connection-record'

function fromPrisma(record: {
  id: string
  ownerId: string
  provider: string
  accessToken: string
  refreshToken: string
  tokenExpiresAt: Date
  calendarId: string
  syncToken: string | null
  channelId: string | null
  resourceId: string | null
  channelExpiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}): CalendarConnectionRecord {
  return {
    id: record.id,
    ownerId: record.ownerId,
    provider: record.provider as CalendarProviderName,
    accessToken: record.accessToken,
    refreshToken: record.refreshToken,
    tokenExpiresAt: record.tokenExpiresAt,
    calendarId: record.calendarId,
    syncToken: record.syncToken,
    channelId: record.channelId,
    resourceId: record.resourceId,
    channelExpiresAt: record.channelExpiresAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

export class PrismaCalendarConnectionRepository
  implements CalendarConnectionRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async save(connection: CalendarConnection): Promise<void> {
    const record = toCalendarConnectionRecord(connection)
    await this.prisma.calendarConnection.upsert({
      where: { id: record.id },
      create: record,
      update: {
        accessToken: record.accessToken,
        refreshToken: record.refreshToken,
        tokenExpiresAt: record.tokenExpiresAt,
        calendarId: record.calendarId,
        syncToken: record.syncToken,
        channelId: record.channelId,
        resourceId: record.resourceId,
        channelExpiresAt: record.channelExpiresAt,
        updatedAt: record.updatedAt,
      },
    })
  }

  async findByOwner(ownerId: EntityId): Promise<CalendarConnection | null> {
    const row = await this.prisma.calendarConnection.findFirst({
      where: { ownerId: ownerId as string },
    })
    return row ? toDomainCalendarConnection(fromPrisma(row)) : null
  }

  async findByChannelId(channelId: string): Promise<CalendarConnection | null> {
    const row = await this.prisma.calendarConnection.findFirst({
      where: { channelId },
    })
    return row ? toDomainCalendarConnection(fromPrisma(row)) : null
  }
}
