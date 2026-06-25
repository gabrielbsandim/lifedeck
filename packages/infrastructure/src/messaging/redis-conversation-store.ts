import {
  InMemoryConversationStore,
  type ConversationStore,
  type ConversationTurn,
} from '@lifedeck/application'

const MAX_TURNS = 20
const TTL_SECONDS = 24 * 60 * 60

class RedisConversationStore implements ConversationStore {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  private key(userId: string): string {
    return `lifedeck/conversation/${userId}`
  }

  private async command(parts: unknown[]): Promise<unknown> {
    const response = await fetch(`${this.url}/${parts.map(String).join('/')}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    })
    if (!response.ok) {
      throw new Error(`Upstash command failed with status ${response.status}`)
    }
    const body = (await response.json()) as { result: unknown }
    return body.result
  }

  async load(userId: string): Promise<ConversationTurn[]> {
    const raw = await this.command(['GET', this.key(userId)])
    if (typeof raw !== 'string' || !raw) {
      return []
    }
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as ConversationTurn[]) : []
    } catch {
      return []
    }
  }

  async append(userId: string, turns: ConversationTurn[]): Promise<void> {
    const next = [...(await this.load(userId)), ...turns].slice(-MAX_TURNS)
    const url = `${this.url}/SET/${this.key(userId)}/${encodeURIComponent(
      JSON.stringify(next),
    )}?EX=${TTL_SECONDS}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}` },
    })
    if (!response.ok) {
      throw new Error(`Upstash command failed with status ${response.status}`)
    }
  }

  async clear(userId: string): Promise<void> {
    await this.command(['DEL', this.key(userId)])
  }
}

export function createConversationStore(): ConversationStore {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    return new InMemoryConversationStore()
  }
  return new RedisConversationStore(url.replace(/\/$/, ''), token)
}
