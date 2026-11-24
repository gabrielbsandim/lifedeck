import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getContainer } from '@/server/container'
import { handleError } from '@/server/api/respond'
import { requireScope } from '@/server/api/authenticate'
import {
  requireEntitlement,
  requireFeature,
} from '@/server/api/entitlement-guard'
import type { BookingContainer } from '@/server/booking-container'

// Every cached public page carries this tag, so any host edit shows at once.
export const BOOKING_PUBLIC_TAG = 'booking-public'

type Run = (booking: BookingContainer) => Promise<Response>
type HostRun = (booking: BookingContainer, userId: string) => Promise<Response>

export async function publicBookingRoute(run: Run): Promise<Response> {
  try {
    const gate = requireFeature('booking')
    if (gate) {
      return gate
    }
    return await run(getContainer().booking)
  } catch (error) {
    return handleError(error)
  }
}

export async function hostBookingRoute(
  request: Request,
  scope: 'booking:read' | 'booking:write',
  run: HostRun,
): Promise<Response> {
  try {
    const gate = requireFeature('booking')
    if (gate) {
      return gate
    }
    const auth = await requireScope(request, scope)
    if (auth instanceof NextResponse) {
      return auth
    }
    const entitled = await requireEntitlement(auth.userId, 'booking')
    if (entitled) {
      return entitled
    }
    const response = await run(getContainer().booking, auth.userId)
    if (scope === 'booking:write') {
      revalidateTag(BOOKING_PUBLIC_TAG, { expire: 0 })
    }
    return response
  } catch (error) {
    return handleError(error)
  }
}

// Action endpoints (cancel, confirm) accept an empty body as "no fields".
export async function readOptionalJson(request: Request): Promise<unknown> {
  const text = await request.text()
  return text.trim() === '' ? {} : JSON.parse(text)
}

export function searchQuery(request: Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url).searchParams)
}
