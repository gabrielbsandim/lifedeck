import { createHash } from 'node:crypto'

// A dedicated secret lets the manage links be rotated on their own; until one
// is set, a key derived from AUTH_SECRET keeps the two purposes apart.
export function bookingLinkSecret(
  env: Record<string, string | undefined>,
): string {
  const explicit = env.BOOKING_LINK_SECRET?.trim()
  if (explicit) {
    return explicit
  }
  const auth = env.AUTH_SECRET?.trim()
  if (!auth) {
    throw new Error('BOOKING_LINK_SECRET or AUTH_SECRET must be configured.')
  }
  return createHash('sha256').update(`booking-link:${auth}`).digest('hex')
}
