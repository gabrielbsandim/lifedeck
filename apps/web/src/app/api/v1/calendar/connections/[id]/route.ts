import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handleError, ok } from '@/server/api/respond'
import { requireScope } from '@/server/api/authenticate'
import {
  requireEntitlement,
  requireFeature,
} from '@/server/api/entitlement-guard'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
    const { id } = await params
    await getContainer().disconnectCalendar(auth.userId, id)
    return ok({ disconnected: true })
  } catch (error) {
    return handleError(error)
  }
}
