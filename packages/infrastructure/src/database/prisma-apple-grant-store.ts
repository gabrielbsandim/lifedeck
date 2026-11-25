import type { EntityId } from '@lifedeck/domain'
import type { AppleGrantStore } from '@lifedeck/application'
import type { PrismaClient } from '@prisma/client'
import { decryptToken, encryptToken } from '@/crypto/token-cipher'

export class PrismaAppleGrantStore implements AppleGrantStore {
  constructor(private readonly prisma: PrismaClient) {}

  async save(userId: EntityId, refreshToken: string): Promise<void> {
    const encrypted = encryptToken(refreshToken)
    await this.prisma.appleGrant.upsert({
      where: { userId: userId as string },
      create: { userId: userId as string, refreshToken: encrypted },
      update: { refreshToken: encrypted },
    })
  }

  async find(userId: EntityId): Promise<string | null> {
    const row = await this.prisma.appleGrant.findUnique({
      where: { userId: userId as string },
    })
    return row ? decryptToken(row.refreshToken) : null
  }
}
