const PARAM = 'returnTo'

// Same-origin paths only: an absolute or protocol-relative URL here would turn
// the sign-in screen into an open redirect.
export function safeReturnTo(value: string | null | undefined): string | null {
  if (!value?.startsWith('/')) {
    return null
  }
  if (value.startsWith('//') || value.startsWith('/\\')) {
    return null
  }
  return value
}

export function signInPath(destination: string): string {
  const safe = safeReturnTo(destination)
  if (!safe || safe === '/') {
    return '/'
  }
  return `/?${PARAM}=${encodeURIComponent(safe)}`
}

export function returnToFrom(search: string): string | null {
  const target = safeReturnTo(new URLSearchParams(search).get(PARAM))
  return target === '/' ? null : target
}
