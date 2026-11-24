import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handleError, ok } from '@/server/api/respond'
import { requireScope } from '@/server/api/authenticate'
import { requireFeature } from '@/server/api/entitlement-guard'
import type { BookingContainer } from '@/server/booking-container'

// Outside hostBookingRoute on purpose: a user without the entitlement is exactly
// who reads and starts the trial.
async function trialRoute(
  request: Request,
  scope: 'booking:read' | 'booking:write',
  run: (booking: BookingContainer, userId: string) => Promise<unknown>,
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
    return ok(await run(getContainer().booking, auth.userId))
  } catch (error) {
    return handleError(error)
  }
}

export async function GET(request: Request) {
  return trialRoute(request, 'booking:read', (booking, userId) =>
    booking.getTrial(userId),
  )
}

export async function POST(request: Request) {
  return trialRoute(request, 'booking:write', (booking, userId) =>
    booking.startTrial(userId),
  )
}
