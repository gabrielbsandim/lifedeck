import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from 'jose'
import {
  InvalidIdentityTokenError,
  type IdentityTokenVerifier,
  type OAuthProfile,
} from '@lifedeck/application'

const ISSUER = 'https://appleid.apple.com'
const KEYS_URL = `${ISSUER}/auth/keys`

export type AppleIdentityVerifierConfig = {
  // Bundle ids whose tokens are accepted, the `aud` Apple signs for.
  audiences: string[]
  keys?: JWTVerifyGetKey
  now?: () => Date
}

// Apple writes the boolean claims as strings on some flows.
function isTrue(value: unknown): boolean {
  return value === true || value === 'true'
}

export class AppleIdentityVerifier implements IdentityTokenVerifier {
  private readonly keys: JWTVerifyGetKey

  constructor(private readonly config: AppleIdentityVerifierConfig) {
    this.keys =
      config.keys ??
      createRemoteJWKSet(new URL(KEYS_URL), { timeoutDuration: 5000 })
  }

  async verify(identityToken: string): Promise<OAuthProfile> {
    const payload = await this.claims(identityToken)
    if (typeof payload.email !== 'string' || !payload.email) {
      throw new InvalidIdentityTokenError()
    }
    return {
      email: payload.email,
      displayName: '',
      emailVerified: isTrue(payload.email_verified),
      avatarUrl: null,
    }
  }

  private async claims(identityToken: string): Promise<JWTPayload> {
    if (this.config.audiences.length === 0) {
      throw new Error('Sign in with Apple has no audience configured.')
    }
    try {
      const { payload } = await jwtVerify(identityToken, this.keys, {
        algorithms: ['RS256'],
        issuer: ISSUER,
        audience: this.config.audiences,
        currentDate: this.config.now?.(),
      })
      return payload
    } catch {
      throw new InvalidIdentityTokenError()
    }
  }
}
