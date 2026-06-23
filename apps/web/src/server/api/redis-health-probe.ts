import { Redis } from '@upstash/redis'
import type { HealthProbe, HealthProbeResult } from '@lifedeck/application'

type Pinger = {
  ping(): Promise<unknown>
}

export class RedisHealthProbe implements HealthProbe {
  readonly name = 'cache'

  constructor(private readonly redis: Pinger) {}

  async check(): Promise<HealthProbeResult> {
    await this.redis.ping()
    return { healthy: true }
  }
}

export function createRedisHealthProbe(): RedisHealthProbe | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    return null
  }
  return new RedisHealthProbe(new Redis({ url, token }))
}
