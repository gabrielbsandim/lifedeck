import type { HealthProbe, HealthProbeResult } from '@lifedeck/application'
import type { PrismaClient } from '@prisma/client'

export class PrismaHealthProbe implements HealthProbe {
  readonly name = 'database'

  constructor(private readonly prisma: PrismaClient) {}

  async check(): Promise<HealthProbeResult> {
    await this.prisma.$queryRaw`SELECT 1`
    return { healthy: true }
  }
}
