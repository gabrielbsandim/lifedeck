// Base URL for the Lifedeck HTTP API. Set EXPO_PUBLIC_API_URL per environment
// (e.g. the Vercel deployment). Defaults to localhost for local web dev.
//
// The `/api/v1` prefix is deliberately NOT folded into the client's base URL:
// hooks pass the same absolute `/api/v1/...` paths the web passes, so a hook is
// portable between the two apps without rewriting every string.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

export const API_PREFIX = '/api/v1'
