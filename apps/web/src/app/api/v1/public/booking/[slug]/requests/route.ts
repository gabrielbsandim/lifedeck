import { ok } from '@/server/api/respond'
import {
  enforceBookingRequestLimit,
  isHoneypotFilled,
  rejectBot,
} from '@/server/api/booking-guard'
import { publicBookingRoute } from '@/server/api/booking-route'
import type { RequestBookingInput } from '@lifedeck/application'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  return publicBookingRoute(async booking => {
    const blocked = await rejectBot()
    if (blocked) {
      return blocked
    }
    const body = (await request.json()) as RequestBookingInput
    if (isHoneypotFilled(body)) {
      return ok(null, 202)
    }
    const limited = await enforceBookingRequestLimit(
      request,
      String(body.email ?? ''),
    )
    if (limited) {
      return limited
    }
    const { slug } = await params
    return ok(await booking.request(slug, body), 201)
  })
}
