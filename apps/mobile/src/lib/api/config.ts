// Base URL for the Lifedeck HTTP API. Set EXPO_PUBLIC_API_URL per environment
// (e.g. the Vercel deployment). Defaults to localhost for local web dev.
//
// It has to be the host that answers directly. A redirect to another origin
// (the apex redirecting to www, say) drops the Authorization header on the way,
// which fetch does deliberately so a redirect cannot capture a credential. The
// symptom is nasty: signing in works, because that call carries its secret in
// the body, and then every authenticated request afterwards returns 401.
//
// The `/api/v1` prefix is deliberately NOT folded into the client's base URL:
// hooks pass the same absolute `/api/v1/...` paths the web passes, so a hook is
// portable between the two apps without rewriting every string.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

export const API_PREFIX = '/api/v1'
