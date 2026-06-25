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
    const url = new URL(request.url)
    const events = await getContainer().listCalendarEvents(auth.userId, {
      from: url.searchParams.get('from') ?? '',
      to: url.searchParams.get('to') ?? '',
    })
    return ok(events)
  } catch (error) {
    return handleError(error)
  }
}

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
    const body = await request.json()
    const event = await getContainer().createCalendarEvent(auth.userId, body)
    return ok(event, 201)
  } catch (error) {
    return handleError(error)
  }
}
