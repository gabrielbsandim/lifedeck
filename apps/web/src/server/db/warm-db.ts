import { prisma } from '@lifedeck/infrastructure'

// Neon scales the compute to zero after inactivity, so the first query from a
// scheduled cron (which runs with no preceding traffic) hits a suspended
// compute. That first attempt fails transiently while the compute resumes:
// "Can't reach database server" (TCP) or "Connection terminated unexpectedly"
// (serverless WebSocket). These are recoverable within a second or two, so a
// short retry turns a failed cron run into a successful one.
const TRANSIENT_ERROR_FRAGMENTS = [
  "can't reach database server",
  'connection terminated',
  'connection closed',
  'terminating connection',
  'server has closed the connection',
  'econnrefused',
  'econnreset',
]

export function isTransientDbError(error: unknown): boolean {
  const message = (
    error instanceof Error ? error.message : String(error)
  ).toLowerCase()
  return TRANSIENT_ERROR_FRAGMENTS.some(fragment => message.includes(fragment))
}

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms))

/**
 * Run `fn`, retrying only on transient connection errors with exponential
 * backoff. A non-transient error (or the last attempt) rethrows immediately.
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  attempts = 5,
  baseDelayMs = 250,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      if (attempt >= attempts - 1 || !isTransientDbError(error)) {
        throw error
      }
      await sleep(baseDelayMs * 2 ** attempt)
    }
  }
}

/**
 * Resume a possibly-suspended Neon compute before a cron does its real work, so
 * the actual queries run against a warm connection. Idempotent and cheap.
 */
export async function warmDb(): Promise<void> {
  await withDbRetry(() => prisma.$queryRaw`SELECT 1`)
}
