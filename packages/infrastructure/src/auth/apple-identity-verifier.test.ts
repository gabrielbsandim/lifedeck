import { describe, expect, it } from 'vitest'
import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type JWTPayload,
} from 'jose'
import { InvalidIdentityTokenError } from '@lifedeck/application'
import { AppleIdentityVerifier } from '@/auth/apple-identity-verifier'

const AUDIENCE = 'com.gbs.lifedeck'
const NOW = new Date('2026-11-24T12:00:00.000Z')

async function fixture() {
  const { privateKey, publicKey } = await generateKeyPair('RS256')
  const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256' }
  const verifier = new AppleIdentityVerifier({
    audiences: [AUDIENCE],
    keys: createLocalJWKSet({ keys: [jwk] }),
    now: () => NOW,
  })
  const sign = (
    claims: JWTPayload,
    over: { aud?: string; iss?: string } = {},
  ) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer(over.iss ?? 'https://appleid.apple.com')
      .setAudience(over.aud ?? AUDIENCE)
      .setSubject('001234.abc')
      .setIssuedAt(Math.floor(NOW.getTime() / 1000))
      .setExpirationTime(Math.floor(NOW.getTime() / 1000) + 600)
      .sign(privateKey)
  return { verifier, sign }
}

describe('AppleIdentityVerifier', () => {
  it('returns the email Apple vouches for', async () => {
    const { verifier, sign } = await fixture()
    const token = await sign({ email: 'a@example.com', email_verified: 'true' })
    await expect(verifier.verify(token)).resolves.toEqual({
      email: 'a@example.com',
      displayName: '',
      emailVerified: true,
      avatarUrl: null,
    })
    const unverified = await sign({ email: 'a@example.com' })
    await expect(verifier.verify(unverified)).resolves.toMatchObject({
      emailVerified: false,
    })
  })

  it('rejects another app, another issuer, garbage and a token without email', async () => {
    const { verifier, sign } = await fixture()
    const tokens = [
      await sign({ email: 'a@example.com' }, { aud: 'com.other.app' }),
      await sign({ email: 'a@example.com' }, { iss: 'https://evil.test' }),
      'not-a-jwt',
      await sign({}),
    ]
    for (const token of tokens) {
      await expect(verifier.verify(token)).rejects.toBeInstanceOf(
        InvalidIdentityTokenError,
      )
    }
  })

  it('refuses to run without an audience', async () => {
    const verifier = new AppleIdentityVerifier({ audiences: [] })
    await expect(verifier.verify('x')).rejects.toThrow('no audience')
  })
})
