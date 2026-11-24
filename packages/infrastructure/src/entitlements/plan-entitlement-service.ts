import {
  DEFAULT_PLAN,
  entitlementsForPlan,
  type EntityId,
  type Plan,
} from '@lifedeck/domain'
import type {
  Clock,
  EntitlementService,
  FeatureTrialRepository,
  UserEntitlements,
} from '@lifedeck/application'

export type PlanResolver = (userId: string) => Promise<Plan>

export type TrialSource = {
  repository: Pick<FeatureTrialRepository, 'listByUser'>
  clock: Clock
}

export class PlanEntitlementService implements EntitlementService {
  private readonly resolvePlan: PlanResolver

  constructor(
    resolvePlan: PlanResolver = async () => DEFAULT_PLAN,
    private readonly trials?: TrialSource,
  ) {
    this.resolvePlan = resolvePlan
  }

  async for(userId: string): Promise<UserEntitlements> {
    const plan = await this.resolvePlan(userId)
    const granted = [...entitlementsForPlan(plan)]
    // Only plans without booking can be on a trial, so paying users skip the read.
    if (!this.trials || granted.includes('booking')) {
      return { plan, entitlements: granted }
    }
    const now = this.trials.clock.now()
    // A cast, not asEntityId: an entitlement check must never throw on an id.
    const trials = await this.trials.repository.listByUser(userId as EntityId)
    const trialing = trials
      .filter(trial => trial.endsAt > now)
      .map(trial => trial.entitlement)
      .filter(entitlement => !granted.includes(entitlement))
    return { plan, entitlements: [...granted, ...trialing] }
  }
}
