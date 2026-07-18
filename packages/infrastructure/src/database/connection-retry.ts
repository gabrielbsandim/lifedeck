// Neon scales the compute to zero after inactivity. The first query after a
// resume (and any query that grabs a pooled connection Neon closed on suspend)
// fails with a transient connection error. These are recoverable: the pool
// discards the bad connection and the next attempt opens a fresh one.
const TRANSIENT_CONNECTION_FRAGMENTS = [
  'error in postgresql connection',
  'kind: closed',
  "can't reach database server",
  'connection terminated',
  'connection closed',
  'server has closed the connection',
  'connection reset',
  'econnreset',
  'econnrefused',
  'timed out',
]

export function isTransientConnectionError(error: unknown): boolean {
  const message = (
    error instanceof Error ? error.message : String(error)
  ).toLowerCase()
  return TRANSIENT_CONNECTION_FRAGMENTS.some(fragment =>
    message.includes(fragment),
  )
}

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms))

/**
 * Run `fn`, retrying only transient database connection errors with exponential
 * backoff. Non-connection errors (and the final attempt) rethrow immediately.
 */
export async function retryOnTransientConnection<T>(
  fn: () => Promise<T>,
  attempts = 4,
  baseDelayMs = 150,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      if (attempt >= attempts - 1 || !isTransientConnectionError(error)) {
        throw error
      }
      await sleep(baseDelayMs * 2 ** attempt)
    }
  }
}
