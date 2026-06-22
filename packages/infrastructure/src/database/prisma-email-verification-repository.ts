import type { EmailVerification, EntityId } from '@taskin/domain'
import type { EmailVerificationRepository } from '@taskin/application'
import type { PrismaClient } from '@prisma/client'
import {
  toDomainEmailVerification,
  toEmailVerificationRecord,
} from '@/database/email-verification-record'

export class PrismaEmailVerificationRepository
  implements EmailVerificationRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async save(verification: EmailVerification): Promise<void> {
    const record = toEmailVerificationRecord(verification)
    await this.prisma.emailVerification.upsert({
      where: { userId: record.userId },
      create: record,
      update: {
        id: record.id,
        codeHash: record.codeHash,
        expiresAt: record.expiresAt,
        createdAt: record.createdAt,
      },
    })
  }

  async findByUserId(userId: EntityId): Promise<EmailVerification | null> {
    const record = await this.prisma.emailVerification.findUnique({
      where: { userId },
    })
    return record ? toDomainEmailVerification(record) : null
  }

  async deleteByUserId(userId: EntityId): Promise<void> {
    await this.prisma.emailVerification.deleteMany({ where: { userId } })
  }
}
