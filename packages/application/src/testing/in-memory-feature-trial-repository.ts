import type { EntityId } from '@lifedeck/domain'
import type {
  FeatureTrial,
  FeatureTrialRepository,
} from '@/ports/feature-trial-repository'

export class InMemoryFeatureTrialRepository implements FeatureTrialRepository {
  private readonly trials = new Map<string, FeatureTrial[]>()

  async listByUser(userId: EntityId): Promise<FeatureTrial[]> {
    return [...(this.trials.get(userId) ?? [])]
  }

  async start(userId: EntityId, trial: FeatureTrial): Promise<boolean> {
    const existing = this.trials.get(userId) ?? []
    if (existing.some(item => item.entitlement === trial.entitlement)) {
      return false
    }
    this.trials.set(userId, [...existing, trial])
    return true
  }
}
