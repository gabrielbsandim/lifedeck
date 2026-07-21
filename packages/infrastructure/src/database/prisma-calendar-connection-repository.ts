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
  refreshToken: string | null
  tokenExpiresAt: Date | null
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
    refreshToken: record.refreshToken
      ? decryptToken(record.refreshToken)
      : null,
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

  // Map a row to the domain, isolating a decrypt failure (a rotated
  // CALENDAR_TOKEN_KEY or a corrupt ciphertext) to that single row instead of
  // letting it throw out of a list query and break sync for every user.
  private toDomain(
    row: Parameters<typeof fromPrisma>[0],
  ): CalendarConnection | null {
    try {
      return toDomainCalendarConnection(fromPrisma(row))
    } catch {
      console.warn(
        `[lifedeck] skipping calendar connection ${row.id}: token could not be decrypted`,
      )
      return null
    }
  }

  async save(connection: CalendarConnection): Promise<void> {
    const record = toCalendarConnectionRecord(connection)
    const accessToken = encryptToken(record.accessToken)
    const refreshToken = record.refreshToken
      ? encryptToken(record.refreshToken)
      : null
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
    return row ? this.toDomain(row) : null
  }

  async findByChannelId(channelId: string): Promise<CalendarConnection | null> {
    const row = await this.prisma.calendarConnection.findFirst({
      where: { channelId },
    })
    return row ? this.toDomain(row) : null
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
    return row ? this.toDomain(row) : null
  }

  async listByOwner(ownerId: EntityId): Promise<CalendarConnection[]> {
    const rows = await this.prisma.calendarConnection.findMany({
      where: { ownerId: ownerId as string },
      orderBy: { createdAt: 'asc' },
    })
    return rows
      .map(row => this.toDomain(row))
      .filter((c): c is CalendarConnection => c !== null)
  }

  async listAll(): Promise<CalendarConnection[]> {
    const rows = await this.prisma.calendarConnection.findMany()
    return rows
      .map(row => this.toDomain(row))
      .filter((c): c is CalendarConnection => c !== null)
  }

  async delete(id: EntityId): Promise<void> {
    await this.prisma.calendarConnection.deleteMany({
      where: { id: id as string },
    })
  }
}
