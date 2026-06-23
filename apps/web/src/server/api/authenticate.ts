import { type NextResponse } from 'next/server'
import { API_SCOPES, type ApiScope } from '@lifedeck/domain'
import { getContainer } from '@/server/container'
import { fail } from '@/server/api/respond'
import {
  checkRateLimit,
  checkSessionRateLimit,
  rateLimitHeaders,
} from '@/server/api/rate-limit'
import { getUserIdFromRequest } from '@/server/session/session'

export const API_KEY_PREFIX = 'tk_live_'

export type Principal = {
  keyId: string | null
  userId: string
  scopes: ApiScope[]
  viaApiKey: boolean
}

function readApiKey(request: Request): string | null {
  const authorization = request.headers.get('authorization')
  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice('Bearer '.length).trim()
    if (token.startsWith(API_KEY_PREFIX)) {
      return token
    }
  }
  const header = request.headers.get('x-api-key')
  if (header?.startsWith(API_KEY_PREFIX)) {
    return header.trim()
  }
  return null
}

export async function authenticateRequest(
  request: Request,
): Promise<Principal | null> {
  const rawKey = readApiKey(request)
  if (rawKey) {
    const principal = await getContainer().authenticateApiKey(rawKey)
    if (!principal) {
      return null
    }
    return { ...principal, viaApiKey: true }
  }
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return null
  }
  return { keyId: null, userId, scopes: [...API_SCOPES], viaApiKey: false }
}

export function hasScope(principal: Principal, scope: ApiScope): boolean {
  return principal.scopes.includes(scope)
}

export async function requireScope(
  request: Request,
  scope: ApiScope,
): Promise<{ userId: string } | NextResponse> {
  const principal = await authenticateRequest(request)
  if (!principal) {
    return fail('UNAUTHORIZED', 'Authentication required.', 401)
  }
  if (!hasScope(principal, scope)) {
    return fail(
      'FORBIDDEN',
      `The API key is missing the "${scope}" scope.`,
      403,
    )
  }
  const rate =
    principal.viaApiKey && principal.keyId
      ? await checkRateLimit(`apikey:${principal.keyId}`)
      : await checkSessionRateLimit(`user:${principal.userId}`)
  if (!rate.ok) {
    return fail('RATE_LIMITED', 'Too many requests.', 429, undefined, {
      headers: rateLimitHeaders(rate),
    })
  }
  return { userId: principal.userId }
}

export async function optionalUserId(
  request: Request,
  scope: ApiScope,
): Promise<string | null> {
  const principal = await authenticateRequest(request)
  if (!principal || !hasScope(principal, scope)) {
    return null
  }
  return principal.userId
}
