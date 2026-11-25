import { SignJWT, importPKCS8 } from 'jose'
import type { AppleTokenClient } from '@lifedeck/application'

const ISSUER = 'https://appleid.apple.com'
const SECRET_TTL_SECONDS = 300

export type AppleTokenClientConfig = {
  teamId: string
  keyId: string
  // The Sign in with Apple .p8 key, PEM text.
  privateKey: string
  clientId: string
  fetch?: typeof fetch
  now?: () => Date
}

export class HttpAppleTokenClient implements AppleTokenClient {
  private readonly fetch: typeof fetch

  constructor(private readonly config: AppleTokenClientConfig) {
    this.fetch = config.fetch ?? fetch
  }

  async exchange(authorizationCode: string): Promise<string> {
    const body = await this.post('/auth/token', {
      grant_type: 'authorization_code',
      code: authorizationCode,
    })
    const refreshToken = (body as { refresh_token?: unknown }).refresh_token
    if (typeof refreshToken !== 'string' || !refreshToken) {
      throw new Error('Apple returned no refresh token.')
    }
    return refreshToken
  }

  async revoke(refreshToken: string): Promise<void> {
    await this.post('/auth/revoke', {
      token: refreshToken,
      token_type_hint: 'refresh_token',
    })
  }

  private async post(
    path: string,
    fields: Record<string, string>,
  ): Promise<unknown> {
    const form = new URLSearchParams({
      ...fields,
      client_id: this.config.clientId,
      client_secret: await this.clientSecret(),
    })
    const response = await this.fetch(`${ISSUER}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) {
      throw new Error(`Apple ${path} failed with ${response.status}.`)
    }
    const text = await response.text()
    return text ? JSON.parse(text) : {}
  }

  private async clientSecret(): Promise<string> {
    const key = await importPKCS8(this.config.privateKey, 'ES256')
    const issuedAt = Math.floor(
      (this.config.now?.() ?? new Date()).getTime() / 1000,
    )
    return new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: this.config.keyId })
      .setIssuer(this.config.teamId)
      .setSubject(this.config.clientId)
      .setAudience(ISSUER)
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + SECRET_TTL_SECONDS)
      .sign(key)
  }
}
