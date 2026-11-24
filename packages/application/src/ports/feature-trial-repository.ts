import type { Entitlement, EntityId } from '@lifedeck/domain'

export type FeatureTrial = {
  entitlement: Entitlement
  startedAt: Date
  endsAt: Date
}

export interface FeatureTrialRepository {
  listByUser(userId: EntityId): Promise<FeatureTrial[]>
  /** False when the user already had a trial of that entitlement. */
  start(userId: EntityId, trial: FeatureTrial): Promise<boolean>
}
