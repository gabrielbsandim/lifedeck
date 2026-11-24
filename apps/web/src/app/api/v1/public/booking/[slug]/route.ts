import { ok } from '@/server/api/respond'
import { enforceBookingSlotsLimit } from '@/server/api/booking-guard'
import { publicBookingRoute } from '@/server/api/booking-route'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  return publicBookingRoute(async booking => {
    const limited = await enforceBookingSlotsLimit(request)
    if (limited) {
      return limited
    }
    const { slug } = await params
    return ok(await booking.getPublicPage(slug))
  })
}
