import type {
  PushMessage,
  PushSendResult,
  PushSender,
} from '@lifedeck/application'
import { httpFetch } from '@/http/http-fetch'

const DEFAULT_BASE_URL = 'https://exp.host'
// Expo rejects a request carrying more than 100 messages, so a fan-out to a
// user with many devices is chunked rather than truncated.
const MAX_PER_REQUEST = 100

export interface ExpoPushSenderConfig {
  /** Only needed when the Expo account enforces push security. */
  accessToken?: string
  /** Defaults to https://exp.host. */
  baseUrl?: string
}

type ExpoTicket = {
  status: 'ok' | 'error'
  message?: string
  details?: { error?: string }
}

// The one error that means this token will never work again. Deliberately not a
// wider list: `InvalidCredentials` for instance is an account-level problem, and
// treating it as a dead token would delete every registration we have the moment
// the push credentials were misconfigured.
const DEAD_TOKEN_ERROR = 'DeviceNotRegistered'

/**
 * Delivers push notifications through Expo's push service, which fronts APNs
 * and FCM so the app does not need per-platform credentials in this codebase:
 * EAS holds them and Expo signs the sends.
 *
 * The tickets returned here confirm that Expo accepted a message, not that a
 * phone displayed it. Final delivery is reported later through the receipts
 * endpoint; the one failure that matters for data hygiene, a token that no
 * longer exists, is already reported synchronously and is what this prunes.
 */
export class ExpoPushSender implements PushSender {
  private readonly accessToken?: string
  private readonly baseUrl: string

  constructor(config: ExpoPushSenderConfig = {}) {
    this.accessToken = config.accessToken
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '')
  }

  async send(messages: PushMessage[]): Promise<PushSendResult> {
    const invalidTokens: string[] = []
    let delivered = 0

    for (let i = 0; i < messages.length; i += MAX_PER_REQUEST) {
      const chunk = messages.slice(i, i + MAX_PER_REQUEST)
      const tickets = await this.post(chunk)
      chunk.forEach((message, index) => {
        const ticket = tickets[index]
        if (ticket?.status === 'ok') {
          delivered += 1
          return
        }
        if (ticket?.details?.error === DEAD_TOKEN_ERROR) {
          invalidTokens.push(message.token)
        }
      })
    }

    return { delivered, invalidTokens }
  }

  private async post(messages: PushMessage[]): Promise<ExpoTicket[]> {
    const response = await httpFetch(`${this.baseUrl}/--/api/v2/push/send`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        ...(this.accessToken
          ? { authorization: `Bearer ${this.accessToken}` }
          : {}),
      },
      body: JSON.stringify(
        messages.map(message => ({
          to: message.token,
          title: message.title,
          body: message.body,
          data: message.data,
          sound: 'default',
          // Android groups by channel; without one the OS decides, and the
          // default channel cannot be renamed later.
          channelId: 'default',
        })),
      ),
    })

    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`Expo push failed (${response.status}): ${detail}`)
    }

    const payload = (await response.json()) as { data?: ExpoTicket[] }
    return payload.data ?? []
  }
}

// Expo accepts unauthenticated sends by default, so the token is optional: it is
// only required once the Expo account turns on enhanced push security.
export function createPushSender(): PushSender {
  return new ExpoPushSender({
    accessToken: process.env.EXPO_ACCESS_TOKEN?.trim() || undefined,
  })
}
