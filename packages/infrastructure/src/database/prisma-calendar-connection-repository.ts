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
import { decryptToken, encryptToken } from '@/crypto/token-cipher'

function fromPrisma(record: {
  id: string
  ownerId: string
  provider: string
  accountEmail: string | null
  isDefault: boolean
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
    accountEmail: record.accountEmail,
    isDefault: record.isDefault,
    accessToken: decryptToken(record.accessToken),
    refreshToken: decryptToken(record.refreshToken),
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
    const accessToken = encryptToken(record.accessToken)
    const refreshToken = encryptToken(record.refreshToken)
    await this.prisma.calendarConnection.upsert({
      where: { id: record.id },
      create: { ...record, accessToken, refreshToken },
      update: {
        accountEmail: record.accountEmail,
        isDefault: record.isDefault,
        accessToken,
        refreshToken,
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

  async findById(id: EntityId): Promise<CalendarConnection | null> {
    const row = await this.prisma.calendarConnection.findUnique({
      where: { id: id as string },
    })
    return row ? toDomainCalendarConnection(fromPrisma(row)) : null
  }

  async findByChannelId(channelId: string): Promise<CalendarConnection | null> {
    const row = await this.prisma.calendarConnection.findFirst({
      where: { channelId },
    })
    return row ? toDomainCalendarConnection(fromPrisma(row)) : null
  }

  async findDefaultByOwner(
    ownerId: EntityId,
  ): Promise<CalendarConnection | null> {
    // Prefer the connection the user marked as default; fall back to the oldest
    // so locally-created events always have a calendar to push to.
    const row = await this.prisma.calendarConnection.findFirst({
      where: { ownerId: ownerId as string },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })
    return row ? toDomainCalendarConnection(fromPrisma(row)) : null
  }

  async listByOwner(ownerId: EntityId): Promise<CalendarConnection[]> {
    const rows = await this.prisma.calendarConnection.findMany({
      where: { ownerId: ownerId as string },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(row => toDomainCalendarConnection(fromPrisma(row)))
  }

  async listAll(): Promise<CalendarConnection[]> {
    const rows = await this.prisma.calendarConnection.findMany()
    return rows.map(row => toDomainCalendarConnection(fromPrisma(row)))
  }

  async delete(id: EntityId): Promise<void> {
    await this.prisma.calendarConnection.deleteMany({
      where: { id: id as string },
    })
  }
}
