import { NextResponse } from 'next/server'
import { hostBookingRoute } from '@/server/api/booking-route'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ date: string }> },
) {
  return hostBookingRoute(request, 'booking:write', async (booking, userId) => {
    const { date } = await params
    await booking.deleteOverride(userId, date)
    return new NextResponse(null, { status: 204 })
  })
}
