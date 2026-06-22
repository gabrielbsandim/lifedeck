import type { OAuthProfile, OAuthProvider } from '@taskin/application'

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo'

export type GoogleOAuthConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export class GoogleOAuthProvider implements OAuthProvider {
  constructor(private readonly config: GoogleOAuthConfig) {}

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    })
    return `${AUTH_ENDPOINT}?${params.toString()}`
  }

  async exchangeCode(code: string): Promise<OAuthProfile> {
    const tokenResponse = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange the Google authorization code.')
    }
    const token = (await tokenResponse.json()) as { access_token: string }

    const profileResponse = await fetch(USERINFO_ENDPOINT, {
      headers: { authorization: `Bearer ${token.access_token}` },
    })
    if (!profileResponse.ok) {
      throw new Error('Failed to load the Google profile.')
    }
    const profile = (await profileResponse.json()) as {
      email: string
      name?: string
      email_verified?: boolean
    }

    return {
      email: profile.email,
      displayName: profile.name ?? '',
      emailVerified: profile.email_verified === true,
    }
  }
}
