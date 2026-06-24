import { randomUUID } from 'node:crypto'
import type { UsageCounts, UsageMeter } from '@lifedeck/application'

const FIVE_HOUR_MS = 5 * 60 * 60 * 1000
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

class NoopUsageMeter implements UsageMeter {
  async current(): Promise<UsageCounts> {
    return { fiveHour: 0, weekly: 0 }
  }

  async add(): Promise<UsageCounts> {
    return { fiveHour: 0, weekly: 0 }
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
    const response = await fetch(`${this.url}/pipeline`, {
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
}

export function createUsageMeter(): UsageMeter {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    return new NoopUsageMeter()
  }
  return new RedisUsageMeter(url.replace(/\/$/, ''), token)
}
