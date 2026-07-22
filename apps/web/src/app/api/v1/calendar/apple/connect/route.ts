import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handleError, ok } from '@/server/api/respond'
import { requireScope } from '@/server/api/authenticate'
import {
  requireEntitlement,
  requireFeature,
  requirePremium,
} from '@/server/api/entitlement-guard'

// Connect an Apple (iCloud) calendar with an Apple ID + app-specific password.
// Premium-only, on top of the calendarSync entitlement.
export async function POST(request: Request) {
  try {
    const gate = requireFeature('calendar')
    if (gate) {
      return gate
    }
    const auth = await requireScope(request, 'calendar:write')
    if (auth instanceof NextResponse) {
      return auth
    }
    const entitled = await requireEntitlement(auth.userId, 'calendarSync')
    if (entitled) {
      return entitled
    }
    const premium = await requirePremium(auth.userId)
    if (premium) {
      return premium
    }
    const body = (await request.json()) as {
      email?: unknown
      appPassword?: unknown
    }
    const result = await getContainer().connectCalendarWithCredentials(
      auth.userId,
      {
        provider: 'apple',
        accountEmail: String(body.email ?? '').trim(),
        secret: String(body.appPassword ?? '').trim(),
      },
    )
    // Seed the new calendar's events immediately; a failure here is non-fatal
    // (the periodic reconcile will catch up).
    await getContainer()
      .pullCalendarChanges(auth.userId, { force: true })
      .catch(() => undefined)
    return ok(result, 201)
  } catch (error) {
    return handleError(error)
  }
}
