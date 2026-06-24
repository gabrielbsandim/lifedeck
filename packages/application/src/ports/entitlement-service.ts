import type { Entitlement, Plan } from '@lifedeck/domain'

export type UserEntitlements = {
  plan: Plan
  entitlements: Entitlement[]
}

export interface EntitlementService {
  for(userId: string): Promise<UserEntitlements>
}
