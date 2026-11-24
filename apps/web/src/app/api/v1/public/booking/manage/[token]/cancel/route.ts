import { ok } from '@/server/api/respond'
import { enforceBookingSlotsLimit } from '@/server/api/booking-guard'
import {
  publicBookingRoute,
  readOptionalJson,
} from '@/server/api/booking-route'
import type { BookingReasonInput } from '@lifedeck/application'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  return publicBookingRoute(async booking => {
    const limited = await enforceBookingSlotsLimit(request)
    if (limited) {
      return limited
    }
    const { token } = await params
    const body = (await readOptionalJson(request)) as BookingReasonInput
    return ok(await booking.cancelByToken(token, body))
  })
}
