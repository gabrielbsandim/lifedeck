import {
  claimSingleUseCode,
  storeSingleUseCode,
} from '@/server/session/native-auth'
import { createSessionToken } from '@/server/session/session'

// App to browser handoff: the app holds a Bearer token the system browser
// cannot see, so it trades it for a one-minute, single-use code that the
// browser redeems for its own session cookie. Only a fixed set of pages is a
// valid destination, so a code can never be turned into an open redirect.

const HANDOFF_PREFIX = 'lifedeck/web-handoff/'
const HANDOFF_TTL_SECONDS = 60

export const WEB_HANDOFF_DESTINATIONS = ['/settings/billing'] as const

export type WebHandoffDestination = (typeof WEB_HANDOFF_DESTINATIONS)[number]

export function webHandoffDestination(
  value: unknown,
): WebHandoffDestination | null {
  return (
    WEB_HANDOFF_DESTINATIONS.find(destination => destination === value) ?? null
  )
}

export async function issueWebHandoffCode(
  userId: string,
  now: Date,
): Promise<string | null> {
  const token = await createSessionToken(userId, now)
  return storeSingleUseCode(HANDOFF_PREFIX, token, HANDOFF_TTL_SECONDS)
}

export function claimWebHandoffCode(code: string): Promise<string | null> {
  return claimSingleUseCode(HANDOFF_PREFIX, code)
}

export function webHandoffUrl(
  origin: string,
  code: string,
  destination: WebHandoffDestination,
): string {
  const query = new URLSearchParams({ code, next: destination })
  return `${origin}/api/v1/auth/web-handoff?${query.toString()}`
}
