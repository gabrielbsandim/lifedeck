import { ok } from '@/server/api/respond'
import { hostBookingRoute, searchQuery } from '@/server/api/booking-route'

export async function GET(request: Request) {
  return hostBookingRoute(request, 'booking:read', async (booking, userId) =>
    ok(await booking.checkSlug(userId, searchQuery(request).slug ?? '')),
  )
}
