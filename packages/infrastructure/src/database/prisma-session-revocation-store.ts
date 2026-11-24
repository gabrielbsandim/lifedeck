import type { EntityId } from '@lifedeck/domain'
import type { SessionRevocationStore } from '@lifedeck/application'
import type { PrismaClient } from '@prisma/client'

export class PrismaSessionRevocationStore implements SessionRevocationStore {
  constructor(private readonly prisma: PrismaClient) {}

  async validFrom(userId: EntityId): Promise<Date | null> {
    const record = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { sessionsValidFrom: true },
    })
    return record?.sessionsValidFrom ?? null
  }

  async revokeAll(userId: EntityId, at: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { sessionsValidFrom: at },
    })
  }
}
