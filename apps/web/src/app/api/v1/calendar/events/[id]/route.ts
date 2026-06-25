import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handleError, ok } from '@/server/api/respond'
import { requireScope } from '@/server/api/authenticate'
import {
  requireEntitlement,
  requireFeature,
} from '@/server/api/entitlement-guard'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
    const { id } = await params
    const event = await getContainer().getCalendarEvent(auth.userId, id)
    return ok(event)
  } catch (error) {
    return handleError(error)
  }
}

export async function PATCH(
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
    const body = await request.json()
    const event = await getContainer().updateCalendarEvent(
      auth.userId,
      id,
      body,
    )
    return ok(event)
  } catch (error) {
    return handleError(error)
  }
}

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
    await getContainer().deleteCalendarEvent(auth.userId, id)
    return ok({ deleted: true })
  } catch (error) {
    return handleError(error)
  }
}
