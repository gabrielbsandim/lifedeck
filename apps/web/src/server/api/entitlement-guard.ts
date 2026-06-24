import { type NextResponse } from 'next/server'
import { type Entitlement } from '@lifedeck/domain'
import { getContainer } from '@/server/container'
import { fail } from '@/server/api/respond'
import { isFeatureEnabled, type Feature } from '@/server/api/features'

export function requireFeature(feature: Feature): NextResponse | null {
  if (!isFeatureEnabled(feature)) {
    return fail('NOT_FOUND', 'Not found.', 404)
  }
  return null
}

export async function requireEntitlement(
  userId: string,
  entitlement: Entitlement,
): Promise<NextResponse | null> {
  const { entitlements } = await getContainer().entitlements.for(userId)
  if (!entitlements.includes(entitlement)) {
    return fail(
      'FORBIDDEN',
      `Your plan does not include "${entitlement}".`,
      403,
    )
  }
  return null
}
