import { SignJWT, jwtVerify } from 'jose'

export const SESSION_COOKIE = 'lifedeck_session'
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

type CookieOptions = {
  httpOnly: true
  secure: boolean
  sameSite: 'lax'
  path: '/'
  maxAge: number
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error('AUTH_SECRET is not configured.')
  }
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(
  userId: string,
  issuedAt: Date,
): Promise<string> {
  const issuedAtSeconds = Math.floor(issuedAt.getTime() / 1000)
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt(issuedAtSeconds)
    .setExpirationTime(issuedAtSeconds + SESSION_TTL_SECONDS)
    .sign(getSecret())
}

export async function readSessionToken(token: string): Promise<string | null> {
  try {
    // Pin the algorithm: never let the token header dictate how it is verified.
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ['HS256'],
    })
    return payload.sub ?? null
  } catch {
    return null
  }
}

export function sessionCookieOptions(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  }
}

export function parseSessionCookie(request: Request): string | null {
  const header = request.headers.get('cookie')
  if (!header) {
    return null
  }
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === SESSION_COOKIE) {
      return decodeURIComponent(rest.join('='))
    }
  }
  return null
}

// Native clients have no cookie jar, so they send the same session JWT as a
// Bearer token. API keys (tk_live_...) are a different scheme owned by the
// API-key authenticator, so they are deliberately ignored here.
export function parseSessionBearer(request: Request): string | null {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return null
  }
  const token = authorization.slice('Bearer '.length).trim()
  if (!token || token.startsWith('tk_live_')) {
    return null
  }
  return token
}

export async function getUserIdFromRequest(
  request: Request,
): Promise<string | null> {
  const cookieToken = parseSessionCookie(request)
  if (cookieToken) {
    const userId = await readSessionToken(cookieToken)
    if (userId) {
      return userId
    }
  }
  const bearerToken = parseSessionBearer(request)
  if (bearerToken) {
    return readSessionToken(bearerToken)
  }
  return null
}
