import { ok } from '@/server/api/respond'
import { hostBookingRoute } from '@/server/api/booking-route'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  return hostBookingRoute(request, 'booking:write', async (booking, userId) => {
    const { id } = await params
    return ok(await booking.updateService(userId, id, await request.json()))
  })
}

// Services are archived, never deleted: past bookings still point at them.
export async function DELETE(request: Request, { params }: Params) {
  return hostBookingRoute(request, 'booking:write', async (booking, userId) => {
    const { id } = await params
    return ok(await booking.archiveService(userId, id))
  })
}
