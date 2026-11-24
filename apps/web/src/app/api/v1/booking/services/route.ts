import { ok } from '@/server/api/respond'
import { hostBookingRoute } from '@/server/api/booking-route'

export async function POST(request: Request) {
  return hostBookingRoute(request, 'booking:write', async (booking, userId) =>
    ok(await booking.createService(userId, await request.json()), 201),
  )
}
