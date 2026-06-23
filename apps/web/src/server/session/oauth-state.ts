export const OAUTH_STATE_COOKIE = 'lifedeck_oauth_state'

type OAuthStateCookieOptions = {
  httpOnly: true
  secure: boolean
  sameSite: 'lax'
  path: '/'
  maxAge: number
}

export function oauthStateCookieOptions(
  maxAge: number,
): OAuthStateCookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  }
}

export function parseOAuthStateCookie(request: Request): string | null {
  const header = request.headers.get('cookie')
  if (!header) {
    return null
  }
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === OAUTH_STATE_COOKIE) {
      return decodeURIComponent(rest.join('='))
    }
  }
  return null
}
