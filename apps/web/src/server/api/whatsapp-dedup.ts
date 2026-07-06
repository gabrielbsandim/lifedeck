import { Redis } from '@upstash/redis'

const PREFIX = 'lifedeck/whatsapp/seen'
const TTL_SECONDS = 24 * 60 * 60

let client: Redis | null | undefined

function getRedis(): Redis | null {
  if (client !== undefined) {
    return client
  }
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  client = url && token ? new Redis({ url, token }) : null
  return client
}

/**
 * Whether Upstash is configured. The WhatsApp inbound path fails closed without
 * it because dedup, the per-sender throttle, and the AI credit meter all ride on
 * Upstash, and none of them can enforce anything when it is absent.
 */
export function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  )
}

/**
 * Marks a Meta message id as processed. Returns true when it is newly seen
 * (caller should process it) and false when it was already handled (a Meta
 * retry, skip it). Without Upstash configured there is no dedup, so every
 * message is treated as new.
 */
export async function markMessageProcessed(
  messageId: string,
): Promise<boolean> {
  const redis = getRedis()
  if (!redis) {
    return true
  }
  const result = await redis.set(`${PREFIX}/${messageId}`, '1', {
    nx: true,
    ex: TTL_SECONDS,
  })
  return result === 'OK'
}

/**
 * Releases a dedup claim so a Meta retry can re-attempt a message whose handling
 * failed, instead of it being dropped forever. A no-op without Upstash.
 */
export async function releaseMessageClaim(messageId: string): Promise<void> {
  const redis = getRedis()
  if (!redis) {
    return
  }
  await redis.del(`${PREFIX}/${messageId}`)
}
