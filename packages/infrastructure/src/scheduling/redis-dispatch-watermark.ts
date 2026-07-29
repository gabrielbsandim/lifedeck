import { httpFetch } from '@/http/http-fetch'
import type { DispatchWatermark } from '@lifedeck/application'

const KEY = 'lifedeck:dispatch:next-run-at'
const HEAL_TTL_SECONDS = 6 * 60 * 60
const NOTHING_PENDING = 8640000000000000

const LOWER_SCRIPT = `
local current = redis.call('GET', KEYS[1])
if not current then
  return 0
end
if tonumber(current) <= tonumber(ARGV[1]) then
  return 0
end
redis.call('SET', KEYS[1], ARGV[1], 'KEEPTTL')
return 1
`

type UpstashResponse = { result?: unknown; error?: string }

export class NoopDispatchWatermark implements DispatchWatermark {
  async noteNextRun(_at: Date): Promise<void> {}

  async hasWorkBefore(_now: Date): Promise<boolean> {
    return true
  }

  async markDrained(_nextRunAt: Date | null): Promise<void> {}
}

export class RedisDispatchWatermark implements DispatchWatermark {
  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly onError: (error: unknown) => void = () => {},
  ) {}

  async noteNextRun(at: Date): Promise<void> {
    try {
      await this.command(['EVAL', LOWER_SCRIPT, '1', KEY, String(at.getTime())])
    } catch (error) {
      this.onError(error)
      await this.forget()
    }
  }

  async hasWorkBefore(now: Date): Promise<boolean> {
    try {
      const raw = await this.command(['GET', KEY])
      if (raw === null || raw === undefined) {
        return true
      }
      const next = Number(raw)
      if (!Number.isFinite(next)) {
        return true
      }
      return next <= now.getTime()
    } catch (error) {
      this.onError(error)
      return true
    }
  }

  async markDrained(nextRunAt: Date | null): Promise<void> {
    const value = nextRunAt ? nextRunAt.getTime() : NOTHING_PENDING
    try {
      await this.command([
        'SET',
        KEY,
        String(value),
        'EX',
        String(HEAL_TTL_SECONDS),
      ])
    } catch (error) {
      this.onError(error)
      await this.forget()
    }
  }

  private async forget(): Promise<void> {
    try {
      await this.command(['DEL', KEY])
    } catch (error) {
      this.onError(error)
    }
  }

  private async command(args: string[]): Promise<unknown> {
    const response = await httpFetch(this.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    })
    if (!response.ok) {
      throw new Error(
        `Upstash command ${args[0]} failed with status ${response.status}.`,
      )
    }
    const payload = (await response.json()) as UpstashResponse
    if (payload.error) {
      throw new Error(`Upstash command ${args[0]} failed: ${payload.error}`)
    }
    return payload.result
  }
}

export function createDispatchWatermark(
  onError?: (error: unknown) => void,
): DispatchWatermark {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    return new NoopDispatchWatermark()
  }
  return new RedisDispatchWatermark(url.replace(/\/$/, ''), token, onError)
}
