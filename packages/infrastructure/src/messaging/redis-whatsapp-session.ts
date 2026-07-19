import {
  NoopWhatsappSessionWindow,
  type WhatsappSessionWindow,
} from '@lifedeck/application'
import { normalizePhone } from '@lifedeck/domain'
import { httpFetch } from '@/http/http-fetch'

// WhatsApp's customer-service window is 24h from the user's last message.
const WINDOW_TTL_SECONDS = 24 * 60 * 60

type PipelineResult = Array<{ result: unknown }>

class RedisWhatsappSessionWindow implements WhatsappSessionWindow {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  // Normalize the address so the key matches regardless of formatting on either
  // the inbound (marking) or reminder (checking) side.
  private key(address: string): string {
    return `lifedeck/wa-window/${normalizePhone(address)}`
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

  async markActive(address: string): Promise<void> {
    // The TTL is the whole mechanism: presence of the key means "within 24h".
    await this.pipeline([
      ['SET', this.key(address), '1', 'EX', String(WINDOW_TTL_SECONDS)],
    ])
  }

  async isOpen(address: string): Promise<boolean> {
    const [value] = await this.pipeline([['GET', this.key(address)]])
    return value !== null && value !== undefined
  }
}

export function createWhatsappSessionWindow(): WhatsappSessionWindow {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    return new NoopWhatsappSessionWindow()
  }
  return new RedisWhatsappSessionWindow(url.replace(/\/$/, ''), token)
}
