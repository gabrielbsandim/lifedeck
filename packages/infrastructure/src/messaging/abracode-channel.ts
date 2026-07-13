import type {
  MediaPayload,
  MessageTemplate,
  MessagingChannel,
} from '@lifedeck/application'
import { httpFetch } from '@/http/http-fetch'

const DEFAULT_BASE_URL = 'https://api.abracode.com.br'

export interface AbracodeChannelConfig {
  /** Abracode API key (wpk_live_... / wpk_test_...). */
  apiKey: string
  /** The Abracode PhoneNumber record id (from GET /v1/numbers), not the E.164. */
  from: string
  /** Defaults to https://api.abracode.com.br. */
  baseUrl?: string
  /** Meta phone_number_id, required only to resolve inbound media. */
  phoneNumberId?: string
}

/**
 * Sends and receives WhatsApp through the Abracode gateway instead of talking to
 * Meta's Cloud API directly. Abracode manages the access token, so this adapter
 * only needs an API key. It maps our provider-agnostic MessagingChannel onto
 * Abracode's public REST API (POST /api/v1/messages, GET /api/v1/media/{id}).
 */
export class AbracodeChannel implements MessagingChannel {
  private readonly apiKey: string
  private readonly from: string
  private readonly baseUrl: string
  private readonly phoneNumberId?: string

  constructor(config: AbracodeChannelConfig) {
    this.apiKey = config.apiKey
    this.from = config.from
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '')
    this.phoneNumberId = config.phoneNumberId
  }

  private async postMessage(body: unknown, label: string): Promise<void> {
    const response = await httpFetch(`${this.baseUrl}/api/v1/messages`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const detail = await response.text()
      throw new Error(
        `Abracode ${label} failed (${response.status}): ${detail}`,
      )
    }
  }

  async sendText(to: string, text: string): Promise<void> {
    await this.postMessage(
      { type: 'text', from: this.from, to, body: text },
      'send',
    )
  }

  async sendTemplate(to: string, template: MessageTemplate): Promise<void> {
    await this.postMessage(
      {
        type: 'template',
        from: this.from,
        to,
        templateName: template.name,
        languageCode: template.language,
        components: [
          {
            type: 'body',
            parameters: template.params.map(text => ({ type: 'text', text })),
          },
        ],
      },
      'template',
    )
  }

  async fetchMedia(mediaId: string): Promise<MediaPayload> {
    if (!this.phoneNumberId) {
      throw new Error(
        'Abracode media fetch needs ABRACODE_PHONE_NUMBER_ID (the Meta phone_number_id).',
      )
    }
    const query = new URLSearchParams({ phoneNumberId: this.phoneNumberId })
    const response = await httpFetch(
      `${this.baseUrl}/api/v1/media/${mediaId}?${query}`,
      { headers: { authorization: `Bearer ${this.apiKey}` } },
    )
    if (!response.ok) {
      throw new Error(`Abracode media fetch failed (${response.status}).`)
    }
    return {
      data: await response.arrayBuffer(),
      mimeType:
        response.headers.get('content-type') ?? 'application/octet-stream',
    }
  }
}
