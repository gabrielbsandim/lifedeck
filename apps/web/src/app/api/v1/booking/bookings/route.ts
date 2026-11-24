import { ok } from '@/server/api/respond'
import { hostBookingRoute, searchQuery } from '@/server/api/booking-route'
import type { ListBookingsQuery } from '@lifedeck/application'

export async function GET(request: Request) {
  return hostBookingRoute(request, 'booking:read', async (booking, userId) => {
    const { from, to, status } = searchQuery(request)
    const query = {
      from,
      to,
      status: status ? status.split(',') : undefined,
    } as ListBookingsQuery
    return ok(await booking.listBookings(userId, query))
  })
}

export async function POST(request: Request) {
  return hostBookingRoute(request, 'booking:write', async (booking, userId) =>
    ok(await booking.createForClient(userId, await request.json()), 201),
  )
}
