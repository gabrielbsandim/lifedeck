import { ok } from '@/server/api/respond'
import { enforceBookingSlotsLimit } from '@/server/api/booking-guard'
import { publicBookingRoute, searchQuery } from '@/server/api/booking-route'
import type { ListBookableSlotsQuery } from '@lifedeck/application'

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
    const query = searchQuery(request) as ListBookableSlotsQuery
    return ok(await booking.listSlots(slug, query))
  })
}
