import type { OAuthProfile, OAuthProvider } from '@/ports/oauth-provider'

export class FakeOAuthProvider implements OAuthProvider {
  constructor(
    private profile: OAuthProfile = {
      email: 'oauth@example.com',
      displayName: 'OAuth User',
      emailVerified: true,
    },
  ) {}

  getAuthorizationUrl(state: string): string {
    return `https://oauth.test/authorize?state=${state}`
  }

  async exchangeCode(code: string): Promise<OAuthProfile> {
    if (!code) {
      throw new Error('Missing authorization code.')
    }
    return this.profile
  }
}
