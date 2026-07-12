import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handleError, ok } from '@/server/api/respond'
import { requireScope } from '@/server/api/authenticate'
import {
  requireEntitlement,
  requireFeature,
} from '@/server/api/entitlement-guard'

export async function GET(request: Request) {
  try {
    const gate = requireFeature('calendar')
    if (gate) {
      return gate
    }
    const auth = await requireScope(request, 'calendar:read')
    if (auth instanceof NextResponse) {
      return auth
    }
    const entitled = await requireEntitlement(auth.userId, 'calendarSync')
    if (entitled) {
      return entitled
    }
    const connections = await getContainer().listCalendarConnections(
      auth.userId,
    )
    return ok(connections)
  } catch (error) {
    return handleError(error)
  }
}
