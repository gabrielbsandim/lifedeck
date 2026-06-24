import { DEFAULT_PLAN, entitlementsForPlan, type Plan } from '@lifedeck/domain'
import type {
  EntitlementService,
  UserEntitlements,
} from '@lifedeck/application'

export type PlanResolver = (userId: string) => Promise<Plan>

export class PlanEntitlementService implements EntitlementService {
  private readonly resolvePlan: PlanResolver

  constructor(resolvePlan: PlanResolver = async () => DEFAULT_PLAN) {
    this.resolvePlan = resolvePlan
  }

  async for(userId: string): Promise<UserEntitlements> {
    const plan = await this.resolvePlan(userId)
    return { plan, entitlements: [...entitlementsForPlan(plan)] }
  }
}
