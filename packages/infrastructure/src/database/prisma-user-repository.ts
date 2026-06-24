import type { EntityId, User } from '@lifedeck/domain'
import type { UserRepository } from '@lifedeck/application'
import type { PrismaClient } from '@prisma/client'
import { toDomainUser, toUserRecord } from '@/database/user-record'

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(user: User): Promise<void> {
    const record = toUserRecord(user)
    await this.prisma.user.upsert({
      where: { id: record.id },
      create: record,
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

  async delete(id: EntityId): Promise<void> {
    await this.prisma.user.delete({ where: { id } })
  }
}
