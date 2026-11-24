import { ok } from '@/server/api/respond'
import { hostBookingRoute } from '@/server/api/booking-route'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return hostBookingRoute(request, 'booking:write', async (booking, userId) => {
    const { id } = await params
    return ok(await booking.upsertClient(userId, await request.json(), id))
  })
}
