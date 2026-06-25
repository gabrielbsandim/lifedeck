import type { MediaPayload, MessagingChannel } from '@lifedeck/application'

const GRAPH_VERSION = 'v21.0'

class NoopMessagingChannel implements MessagingChannel {
  async sendText(): Promise<void> {
    // No WhatsApp credentials configured; sends are dropped (dev/preview).
  }

  async fetchMedia(): Promise<MediaPayload> {
    throw new Error('WhatsApp media fetch is not configured.')
  }
}

export class WhatsAppCloudChannel implements MessagingChannel {
  constructor(
    private readonly phoneNumberId: string,
    private readonly accessToken: string,
  ) {}

  async sendText(to: string, text: string): Promise<void> {
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${this.phoneNumberId}/messages`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: text },
      }),
    })
    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`WhatsApp send failed (${response.status}): ${detail}`)
    }
  }

  async fetchMedia(mediaId: string): Promise<MediaPayload> {
    const lookup = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}`,
      { headers: { authorization: `Bearer ${this.accessToken}` } },
    )
    if (!lookup.ok) {
      throw new Error(`WhatsApp media lookup failed (${lookup.status}).`)
    }
    const meta = (await lookup.json()) as { url?: string; mime_type?: string }
    if (!meta.url) {
      throw new Error('WhatsApp media response had no URL.')
    }
    const download = await fetch(meta.url, {
      headers: { authorization: `Bearer ${this.accessToken}` },
    })
    if (!download.ok) {
      throw new Error(`WhatsApp media download failed (${download.status}).`)
    }
    return {
      data: await download.arrayBuffer(),
      mimeType: meta.mime_type ?? 'application/octet-stream',
    }
  }
}

export function createMessagingChannel(): MessagingChannel {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !accessToken) {
    return new NoopMessagingChannel()
  }
  return new WhatsAppCloudChannel(phoneNumberId, accessToken)
}
