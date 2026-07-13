// Every outbound call in this package must have a hard timeout. A hanging
// upstream (Stripe, Meta, Google, Upstash, Asaas) would otherwise block the
// serverless function until Vercel kills it, stalling user-facing requests and
// eating the cron minute budget. AbortSignal.timeout aborts the fetch and
// surfaces a normal TimeoutError we treat like any other upstream failure.
const DEFAULT_TIMEOUT_MS = 10_000

export function httpFetch(
  input: string | URL,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  return fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) })
}
