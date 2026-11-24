import { randomUUID } from 'node:crypto'
import {
  InMemoryTurnLock,
  type ReleaseTurnLock,
  type TurnLock,
} from '@lifedeck/application'
import { httpFetch } from '@/http/http-fetch'

// Outlives the 60 s webhook budget, so a crashed turn frees the user on its own.
const LOCK_TTL_MS = 60_000
// Leaves the waiting turn most of its own 60 s budget to run the model.
const DEFAULT_WAIT_MS = 20_000
const DEFAULT_POLL_MS = 400

// Deletes only our own token, so a turn that outlived the TTL cannot free the
// lock a later turn now holds.
const RELEASE_SCRIPT = `if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0`

type PipelineResult = Array<{ result?: unknown; error?: string }>

export type TurnLockTiming = { waitMs?: number; pollMs?: number }

class RedisTurnLock implements TurnLock {
  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly waitMs: number,
    private readonly pollMs: number,
  ) {}

  private key(userId: string): string {
    return `lifedeck/turn-lock/${userId}`
  }

  private async command(args: unknown[]): Promise<unknown> {
    const response = await httpFetch(`${this.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([args]),
    })
    if (!response.ok) {
      throw new Error(`Upstash pipeline failed with status ${response.status}`)
    }
    const [entry] = (await response.json()) as PipelineResult
    return entry?.result
  }

  async acquire(userId: string): Promise<ReleaseTurnLock | null> {
    const key = this.key(userId)
    const owner = randomUUID()
    const deadline = Date.now() + this.waitMs
    try {
      while (true) {
        const set = await this.command([
          'SET',
          key,
          owner,
          'NX',
          'PX',
          LOCK_TTL_MS,
        ])
        if (set === 'OK') {
          return () => this.release(key, owner)
        }
        if (Date.now() >= deadline) {
          return null
        }
        await new Promise(resolve => setTimeout(resolve, this.pollMs))
      }
    } catch {
      // Fail open: the lock orders turns, and a Redis outage must not cost the
      // user their reply.
      return async () => {}
    }
  }

  private async release(key: string, owner: string): Promise<void> {
    try {
      await this.command(['EVAL', RELEASE_SCRIPT, 1, key, owner])
    } catch {
      // The TTL frees the lock anyway.
    }
  }
}

export function createTurnLock(timing: TurnLockTiming = {}): TurnLock {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    return new InMemoryTurnLock()
  }
  return new RedisTurnLock(
    url.replace(/\/$/, ''),
    token,
    timing.waitMs ?? DEFAULT_WAIT_MS,
    timing.pollMs ?? DEFAULT_POLL_MS,
  )
}
