import { httpFetch } from '@/http/http-fetch'
import type { ProactiveSendGuard } from '@lifedeck/application'

// The per-user daily key self-expires; two days of slack covers timezone edges.
const DAY_TTL_SECONDS = 2 * 24 * 60 * 60

// Always-allow guard for local dev/tests, and the safe fallback when Redis is
// absent: the daily cap is a backstop, so failing open never silences a brief.
class NoopProactiveSendGuard implements ProactiveSendGuard {
  async tryConsume(): Promise<boolean> {
    return true
  }
}

// Atomic INCR-then-EXPIRE on a per-(user, civil day) key; the send is allowed
// while the running count stays within the cap.
class RedisProactiveSendGuard implements ProactiveSendGuard {
  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly cap: number,
  ) {}

  async tryConsume(userId: string, civilDate: string): Promise<boolean> {
    const key = `lifedeck/proactive/${userId}/${civilDate}`
    const response = await httpFetch(`${this.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, DAY_TTL_SECONDS],
      ]),
    })
    if (!response.ok) {
      // Fail open: a guard outage must not block the user's brief.
      return true
    }
    const body = (await response.json()) as { result?: unknown }[]
    const count = Number(body[0]?.result)
    return !Number.isFinite(count) || count <= this.cap
  }
}

export function createProactiveSendGuard(cap: number): ProactiveSendGuard {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    return new NoopProactiveSendGuard()
  }
  return new RedisProactiveSendGuard(url.replace(/\/$/, ''), token, cap)
}
