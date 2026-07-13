import { randomUUID } from 'node:crypto'
import { httpFetch } from '@/http/http-fetch'
import type {
  ConsumeResult,
  UsageCounts,
  UsageMeter,
} from '@lifedeck/application'

const FIVE_HOUR_MS = 5 * 60 * 60 * 1000
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// Trims both windows, sums each, and only ZADDs the new credit when neither
// window would overflow. Running this server-side keeps the check-and-add
// atomic, so concurrent requests cannot both pass a near-full quota.
const CONSUME_SCRIPT = `
local now = tonumber(ARGV[1])
local fiveFloor = tonumber(ARGV[2])
local weekFloor = tonumber(ARGV[3])
local credits = tonumber(ARGV[4])
local fiveLimit = tonumber(ARGV[5])
local weekLimit = tonumber(ARGV[6])
local member = ARGV[7]
local fiveTtl = tonumber(ARGV[8])
local weekTtl = tonumber(ARGV[9])

redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, fiveFloor)
redis.call('ZREMRANGEBYSCORE', KEYS[2], 0, weekFloor)

local function sumWindow(key)
  local total = 0
  for _, m in ipairs(redis.call('ZRANGE', key, 0, -1)) do
    local c = tonumber(string.match(m, '^[^:]+'))
    if c then total = total + c end
  end
  return total
end

local fiveUsed = sumWindow(KEYS[1])
local weekUsed = sumWindow(KEYS[2])

if fiveUsed + credits > fiveLimit then
  return {0, 'fiveHour', fiveUsed, weekUsed}
end
if weekUsed + credits > weekLimit then
  return {0, 'weekly', fiveUsed, weekUsed}
end

redis.call('ZADD', KEYS[1], now, member)
redis.call('EXPIRE', KEYS[1], fiveTtl)
redis.call('ZADD', KEYS[2], now, member)
redis.call('EXPIRE', KEYS[2], weekTtl)

return {1, '', fiveUsed + credits, weekUsed + credits}
`

class NoopUsageMeter implements UsageMeter {
  async current(): Promise<UsageCounts> {
    return { fiveHour: 0, weekly: 0 }
  }

  async add(): Promise<UsageCounts> {
    return { fiveHour: 0, weekly: 0 }
  }

  async consume(): Promise<ConsumeResult> {
    return { ok: true, counts: { fiveHour: 0, weekly: 0 } }
  }
}

// In production a missing quota backend is a misconfiguration, not a free pass:
// silently granting unlimited AI is a real cost leak. This meter fails loud on
// every call so the deployment surfaces the problem instead of leaking spend.
class UnconfiguredUsageMeter implements UsageMeter {
  private fail(): never {
    throw new Error(
      'Usage meter is not configured: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN. Refusing to meter AI usage without a quota backend.',
    )
  }

  async current(): Promise<UsageCounts> {
    return this.fail()
  }

  async add(): Promise<UsageCounts> {
    return this.fail()
  }

  async consume(): Promise<ConsumeResult> {
    return this.fail()
  }
}

type PipelineResult = { result: unknown }[]

class RedisUsageMeter implements UsageMeter {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  private key(window: '5h' | 'week', userId: string): string {
    return `lifedeck/usage/${window}/${userId}`
  }

  private async pipeline(commands: unknown[][]): Promise<unknown[]> {
    const response = await httpFetch(`${this.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    })
    if (!response.ok) {
      throw new Error(`Upstash pipeline failed with status ${response.status}`)
    }
    const body = (await response.json()) as PipelineResult
    return body.map(entry => entry.result)
  }

  private sumCredits(members: unknown): number {
    if (!Array.isArray(members)) {
      return 0
    }
    return members.reduce<number>((total, member) => {
      const credits = Number(String(member).split(':')[0])
      return total + (Number.isFinite(credits) ? credits : 0)
    }, 0)
  }

  async current(userId: string): Promise<UsageCounts> {
    const now = Date.now()
    const fiveKey = this.key('5h', userId)
    const weekKey = this.key('week', userId)
    const results = await this.pipeline([
      ['ZREMRANGEBYSCORE', fiveKey, 0, now - FIVE_HOUR_MS],
      ['ZRANGE', fiveKey, 0, -1],
      ['ZREMRANGEBYSCORE', weekKey, 0, now - WEEK_MS],
      ['ZRANGE', weekKey, 0, -1],
    ])
    return {
      fiveHour: this.sumCredits(results[1]),
      weekly: this.sumCredits(results[3]),
    }
  }

  async add(userId: string, credits: number): Promise<UsageCounts> {
    const now = Date.now()
    const member = `${credits}:${now}:${randomUUID()}`
    const fiveKey = this.key('5h', userId)
    const weekKey = this.key('week', userId)
    await this.pipeline([
      ['ZADD', fiveKey, now, member],
      ['EXPIRE', fiveKey, Math.ceil(FIVE_HOUR_MS / 1000)],
      ['ZADD', weekKey, now, member],
      ['EXPIRE', weekKey, Math.ceil(WEEK_MS / 1000)],
    ])
    return this.current(userId)
  }

  async consume(
    userId: string,
    credits: number,
    limits: UsageCounts,
  ): Promise<ConsumeResult> {
    const now = Date.now()
    const member = `${credits}:${now}:${randomUUID()}`
    const fiveKey = this.key('5h', userId)
    const weekKey = this.key('week', userId)
    const [outcome] = await this.pipeline([
      [
        'EVAL',
        CONSUME_SCRIPT,
        2,
        fiveKey,
        weekKey,
        now,
        now - FIVE_HOUR_MS,
        now - WEEK_MS,
        credits,
        limits.fiveHour,
        limits.weekly,
        member,
        Math.ceil(FIVE_HOUR_MS / 1000),
        Math.ceil(WEEK_MS / 1000),
      ],
    ])
    const [ok, window, fiveUsed, weeklyUsed] = outcome as [
      number,
      string,
      number,
      number,
    ]
    if (ok !== 1) {
      return {
        ok: false,
        window: window === 'weekly' ? 'weekly' : 'fiveHour',
        used: window === 'weekly' ? Number(weeklyUsed) : Number(fiveUsed),
      }
    }
    return {
      ok: true,
      counts: { fiveHour: Number(fiveUsed), weekly: Number(weeklyUsed) },
    }
  }
}

export function createUsageMeter(): UsageMeter {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    // Fail loud in production, stay frictionless (no-op) in local dev and tests.
    return process.env.NODE_ENV === 'production'
      ? new UnconfiguredUsageMeter()
      : new NoopUsageMeter()
  }
  return new RedisUsageMeter(url.replace(/\/$/, ''), token)
}
