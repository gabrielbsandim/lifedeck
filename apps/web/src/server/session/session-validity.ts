import { getContainer } from '@/server/container'

// Revocation reaches other instances within this window; the lookup runs once a
// minute per user and instance instead of on every authenticated request.
const CACHE_TTL_MS = 60_000
const CACHE_MAX_ENTRIES = 5_000

type Entry = { validFromSeconds: number; expiresAt: number }

const cache = new Map<string, Entry>()

async function validFromSeconds(userId: string, now: number): Promise<number> {
  const cached = cache.get(userId)
  if (cached && cached.expiresAt > now) {
    return cached.validFromSeconds
  }
  const validFrom = await getContainer().sessionsValidFrom(userId)
  const seconds = validFrom ? Math.floor(validFrom.getTime() / 1000) : 0
  if (cache.size >= CACHE_MAX_ENTRIES) {
    cache.clear()
  }
  cache.set(userId, {
    validFromSeconds: seconds,
    expiresAt: now + CACHE_TTL_MS,
  })
  return seconds
}

// `iat` has one-second resolution, so a token minted in the same second as the
// revocation survives it; the token the revoking request re-issues relies on that.
export async function isSessionCurrent(
  userId: string,
  issuedAtSeconds: number,
): Promise<boolean> {
  return issuedAtSeconds >= (await validFromSeconds(userId, Date.now()))
}

export function forgetSessionValidity(userId: string): void {
  cache.delete(userId)
}

export function clearSessionValidityCache(): void {
  cache.clear()
}
