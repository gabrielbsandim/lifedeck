import { ok } from '@/server/api/respond'
import { hostBookingRoute } from '@/server/api/booking-route'

export async function PUT(request: Request) {
  return hostBookingRoute(request, 'booking:write', async (booking, userId) =>
    ok(await booking.setOverride(userId, await request.json())),
  )
}
