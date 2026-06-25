import {
  InMemoryConversationStore,
  type ConversationStore,
  type ConversationTurn,
} from '@lifedeck/application'

const MAX_TURNS = 20
const TTL_SECONDS = 24 * 60 * 60

type PipelineResult = Array<{ result: unknown }>

class RedisConversationStore implements ConversationStore {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  private key(userId: string): string {
    return `lifedeck/conversation/${userId}`
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

  async load(userId: string): Promise<ConversationTurn[]> {
    const [members] = await this.pipeline([['LRANGE', this.key(userId), 0, -1]])
    if (!Array.isArray(members)) {
      return []
    }
    const turns: ConversationTurn[] = []
    for (const member of members) {
      try {
        turns.push(JSON.parse(String(member)) as ConversationTurn)
      } catch {
        // Skip a corrupt entry rather than drop the whole history.
      }
    }
    return turns
  }

  async append(userId: string, turns: ConversationTurn[]): Promise<void> {
    if (turns.length === 0) {
      return
    }
    const key = this.key(userId)
    // Atomic: append, trim to the rolling window, refresh the TTL. No
    // read-modify-write, so concurrent messages cannot drop each other.
    await this.pipeline([
      ['RPUSH', key, ...turns.map(turn => JSON.stringify(turn))],
      ['LTRIM', key, -MAX_TURNS, -1],
      ['EXPIRE', key, TTL_SECONDS],
    ])
  }

  async clear(userId: string): Promise<void> {
    await this.pipeline([['DEL', this.key(userId)]])
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
