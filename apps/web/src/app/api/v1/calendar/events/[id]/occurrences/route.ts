import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handleError, ok } from '@/server/api/respond'
import { requireScope } from '@/server/api/authenticate'
import {
  requireEntitlement,
  requireFeature,
} from '@/server/api/entitlement-guard'

// Edit a single occurrence ("this event only") of the recurring series [id].
export async function POST(
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
    const event = await getContainer().updateCalendarOccurrence(
      auth.userId,
      id,
      body,
    )
    return ok(event)
  } catch (error) {
    return handleError(error)
  }
}

// Remove a single occurrence ("this event only") of the recurring series [id].
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
    const occurrenceStart = new URL(request.url).searchParams.get(
      'occurrenceStart',
    )
    await getContainer().deleteCalendarOccurrence(
      auth.userId,
      id,
      occurrenceStart ?? '',
    )
    return ok({ deleted: true })
  } catch (error) {
    return handleError(error)
  }
}
