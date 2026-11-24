import { isEntitlement, type EntityId } from '@lifedeck/domain'
import type {
  FeatureTrial,
  FeatureTrialRepository,
} from '@lifedeck/application'
import type { PrismaClient } from '@prisma/client'

export class PrismaFeatureTrialRepository implements FeatureTrialRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listByUser(userId: EntityId): Promise<FeatureTrial[]> {
    const rows = await this.prisma.featureTrial.findMany({
      where: { userId: userId as string },
    })
    return rows.flatMap(row =>
      isEntitlement(row.entitlement)
        ? [
            {
              entitlement: row.entitlement,
              startedAt: row.startedAt,
              endsAt: row.endsAt,
            },
          ]
        : [],
    )
  }

  async start(userId: EntityId, trial: FeatureTrial): Promise<boolean> {
    // ON CONFLICT DO NOTHING on (user, entitlement): two taps race to one trial.
    const { count } = await this.prisma.featureTrial.createMany({
      data: [
        {
          userId: userId as string,
          entitlement: trial.entitlement,
          startedAt: trial.startedAt,
          endsAt: trial.endsAt,
        },
      ],
      skipDuplicates: true,
    })
    return count === 1
  }
}
