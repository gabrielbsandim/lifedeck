import { randomUUID } from 'node:crypto'
import { Redis } from '@upstash/redis'
import { log } from '@/server/api/logger'

// Native Google sign-in handoff.
//
// The OAuth callback runs in a system browser, so it cannot hand the session to
// the app the way it hands it to the web (an httpOnly cookie). Redirecting to
// `lifedeck://...?token=<jwt>` would put a 7-day session token in a URL that a
// hostile app registered on the same custom scheme could intercept, so instead
// the callback stores the token under a single-use code with a short TTL and
// redirects with only that code. The app exchanges it once, over HTTPS, for the
// real token; a stolen code is useless after the first exchange or 2 minutes.

const CODE_PREFIX = 'lifedeck/native-auth/'
const CODE_TTL_SECONDS = 120

// The `.native` marker travels inside the OAuth state (which is echoed back by
// Google and compared against the state cookie), so the callback knows which
// platform started the flow without a second cookie.
const NATIVE_STATE_SUFFIX = '.native'

export function nativeAuthState(): string {
  return `${randomUUID()}${NATIVE_STATE_SUFFIX}`
}

export function isNativeAuthState(state: string | null): boolean {
  return state !== null && state.endsWith(NATIVE_STATE_SUFFIX)
}

let client: Redis | null | undefined

function getRedis(): Redis | null {
  if (client !== undefined) {
    return client
  }
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  client = url && token ? new Redis({ url, token }) : null
  return client
}

// Exposed for tests: the module caches the client, so a test that changes the
// env needs a way to drop it.
export function resetNativeAuthClient(): void {
  client = undefined
}

// Stores the session token under a fresh single-use code. Returns null when
// Redis is unavailable, so the caller can fail the sign-in loudly instead of
// redirecting the app to a code it can never exchange.
export async function issueNativeAuthCode(
  sessionToken: string,
): Promise<string | null> {
  const redis = getRedis()
  if (!redis) {
    log('error', 'native auth code requested without Redis configured')
    return null
  }
  const code = randomUUID()
  try {
    await redis.set(`${CODE_PREFIX}${code}`, sessionToken, {
      ex: CODE_TTL_SECONDS,
    })
    return code
  } catch (error) {
    log('error', 'failed to store native auth code', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

// Reads and deletes the code in one step so a replayed code never resolves.
export async function claimNativeAuthCode(
  code: string,
): Promise<string | null> {
  const redis = getRedis()
  if (!redis) {
    return null
  }
  try {
    const token = await redis.getdel<string>(`${CODE_PREFIX}${code}`)
    return typeof token === 'string' && token.length > 0 ? token : null
  } catch (error) {
    log('error', 'failed to claim native auth code', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

// Deep link the app listens on. Kept here so the callback and the app agree on
// one shape; the scheme matches `expo.scheme` in apps/mobile/app.json.
export function nativeAuthRedirect(params: {
  code?: string
  error?: string
}): string {
  const query = params.code
    ? `code=${encodeURIComponent(params.code)}`
    : `error=${encodeURIComponent(params.error ?? 'auth_failed')}`
  return `lifedeck://auth?${query}`
}
