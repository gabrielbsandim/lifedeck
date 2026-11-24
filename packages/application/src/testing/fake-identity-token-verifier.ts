import { InvalidIdentityTokenError } from '@/errors/use-case-error'
import type { IdentityTokenVerifier } from '@/ports/identity-token-verifier'
import type { OAuthProfile } from '@/ports/oauth-provider'

export const VALID_IDENTITY_TOKEN = 'valid-identity-token'

export class FakeIdentityTokenVerifier implements IdentityTokenVerifier {
  constructor(
    private profile: OAuthProfile = {
      email: 'apple@example.com',
      displayName: '',
      emailVerified: true,
    },
  ) {}

  async verify(identityToken: string): Promise<OAuthProfile> {
    if (identityToken !== VALID_IDENTITY_TOKEN) {
      throw new InvalidIdentityTokenError()
    }
    return this.profile
  }
}
