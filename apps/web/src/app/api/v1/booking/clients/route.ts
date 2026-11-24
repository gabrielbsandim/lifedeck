import { ok } from '@/server/api/respond'
import { hostBookingRoute, searchQuery } from '@/server/api/booking-route'

export async function GET(request: Request) {
  return hostBookingRoute(request, 'booking:read', async (booking, userId) =>
    ok(await booking.listClients(userId, searchQuery(request))),
  )
}

export async function POST(request: Request) {
  return hostBookingRoute(request, 'booking:write', async (booking, userId) =>
    ok(await booking.upsertClient(userId, await request.json()), 201),
  )
}
