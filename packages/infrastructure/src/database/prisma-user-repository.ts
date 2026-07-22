import type { EntityId, User } from '@lifedeck/domain'
import type { UserRepository } from '@lifedeck/application'
import type { PrismaClient, Prisma } from '@prisma/client'
import { toDomainUser, toUserRecord } from '@/database/user-record'

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(user: User): Promise<void> {
    const record = toUserRecord(user)
    const assistantProfile = record.assistantProfile as Prisma.InputJsonValue
    await this.prisma.user.upsert({
      where: { id: record.id },
      create: { ...record, assistantProfile },
      update: {
        displayName: record.displayName,
        email: record.email,
        passwordHash: record.passwordHash,
        emailVerified: record.emailVerified,
        isGuest: record.isGuest,
        locale: record.locale,
        timezone: record.timezone,
        avatarUrl: record.avatarUrl,
        carryOverMode: record.carryOverMode,
        reminderEmail: record.reminderEmail,
        reminderWhatsapp: record.reminderWhatsapp,
        assistantProfile,
      },
    })
  }

  async findById(id: EntityId): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } })
    return record ? toDomainUser(record) : null
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { email } })
    return record ? toDomainUser(record) : null
  }

  async listForDailyDigest(): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: { email: { not: null }, isGuest: false },
    })
    return records.map(toDomainUser)
  }

  async listWithBriefEnabled(): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: {
        isGuest: false,
        assistantProfile: { path: ['briefEnabled'], equals: true },
      },
    })
    return records.map(toDomainUser)
  }

  async listWithNudgesEnabled(): Promise<User[]> {
    // Nudges default on: include everyone who has not explicitly set the flag to
    // false (legacy rows and null profiles read as opted in).
    const records = await this.prisma.user.findMany({
      where: {
        isGuest: false,
        NOT: { assistantProfile: { path: ['nudgesEnabled'], equals: false } },
      },
    })
    return records.map(toDomainUser)
  }

  async delete(id: EntityId): Promise<void> {
    await this.prisma.user.delete({ where: { id } })
  }
}
