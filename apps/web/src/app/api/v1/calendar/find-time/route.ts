import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handleError, ok } from '@/server/api/respond'
import { requireScope } from '@/server/api/authenticate'
import {
  requireEntitlement,
  requireFeature,
} from '@/server/api/entitlement-guard'

// Smart scheduling: propose free slots. Reading the calendar only (booking a
// chosen slot goes through POST /calendar/events), so this needs calendar:read
// plus the Premium `smartScheduling` entitlement.
export async function POST(request: Request) {
  try {
    const gate = requireFeature('calendar')
    if (gate) {
      return gate
    }
    const auth = await requireScope(request, 'calendar:read')
    if (auth instanceof NextResponse) {
      return auth
    }
    const entitled = await requireEntitlement(auth.userId, 'smartScheduling')
    if (entitled) {
      return entitled
    }
    const body = await request.json()
    const slots = await getContainer().findFreeSlots(auth.userId, body)
    return ok(slots)
  } catch (error) {
    return handleError(error)
  }
}
