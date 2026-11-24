import { fail, ok } from '@/server/api/respond'
import { hostBookingRoute, readOptionalJson } from '@/server/api/booking-route'
import type { BookingContainer } from '@/server/booking-container'

type Action = (
  booking: BookingContainer,
  userId: string,
  id: string,
  body: never,
) => Promise<unknown>

const ACTIONS: Record<string, Action> = {
  confirm: (booking, userId, id) => booking.confirm(userId, id),
  decline: (booking, userId, id, body) => booking.decline(userId, id, body),
  cancel: (booking, userId, id, body) => booking.cancel(userId, id, body),
  reschedule: (booking, userId, id, body) =>
    booking.reschedule(userId, id, body),
  outcome: (booking, userId, id, body) => booking.markOutcome(userId, id, body),
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const { id, action } = await params
  const run = Object.hasOwn(ACTIONS, action) ? ACTIONS[action] : undefined
  if (!run) {
    return fail('NOT_FOUND', 'Not found.', 404)
  }
  return hostBookingRoute(request, 'booking:write', async (booking, userId) => {
    const body = (await readOptionalJson(request)) as never
    return ok(await run(booking, userId, id, body))
  })
}
