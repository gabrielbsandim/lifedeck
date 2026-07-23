// Base URL for the Lifedeck HTTP API. Set EXPO_PUBLIC_API_URL per environment
// (e.g. the Vercel deployment). Defaults to localhost for local web dev.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

export const API_PREFIX = '/api/v1'
