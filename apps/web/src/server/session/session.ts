import { SignJWT, jwtVerify } from 'jose'

export const SESSION_COOKIE = 'taskin_session'
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
    const { payload } = await jwtVerify(token, getSecret())
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

export async function getUserIdFromRequest(
  request: Request,
): Promise<string | null> {
  const token = parseSessionCookie(request)
  if (!token) {
    return null
  }
  return readSessionToken(token)
}
