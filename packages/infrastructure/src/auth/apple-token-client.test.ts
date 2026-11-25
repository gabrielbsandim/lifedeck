import { describe, expect, it, vi } from 'vitest'
import { exportPKCS8, generateKeyPair, jwtVerify } from 'jose'
import { HttpAppleTokenClient } from '@/auth/apple-token-client'

const NOW = new Date('2026-11-25T12:00:00.000Z')

async function fixture(response: Response) {
  const { privateKey, publicKey } = await generateKeyPair('ES256', {
    extractable: true,
  })
  const fetch = vi.fn().mockResolvedValue(response)
  const client = new HttpAppleTokenClient({
    teamId: 'TEAM123',
    keyId: 'KEY123',
    privateKey: await exportPKCS8(privateKey),
    clientId: 'com.gbs.lifedeck',
    fetch,
    now: () => NOW,
  })
  const sent = () => {
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit]
    return { url, form: init.body as URLSearchParams }
  }
  return { client, sent, publicKey }
}

describe('HttpAppleTokenClient', () => {
  it('trades the code for a refresh token with a signed client secret', async () => {
    const ctx = await fixture(
      Response.json({ refresh_token: 'r1', access_token: 'a1' }),
    )
    await expect(ctx.client.exchange('code-1')).resolves.toBe('r1')
    const { url, form } = ctx.sent()
    expect(url).toBe('https://appleid.apple.com/auth/token')
    expect(form.get('grant_type')).toBe('authorization_code')
    expect(form.get('code')).toBe('code-1')
    expect(form.get('client_id')).toBe('com.gbs.lifedeck')
    const { payload, protectedHeader } = await jwtVerify(
      form.get('client_secret') ?? '',
      ctx.publicKey,
      { currentDate: NOW },
    )
    expect(protectedHeader).toMatchObject({ alg: 'ES256', kid: 'KEY123' })
    expect(payload).toMatchObject({
      iss: 'TEAM123',
      sub: 'com.gbs.lifedeck',
      aud: 'https://appleid.apple.com',
    })
  })

  it('fails when Apple sends no refresh token', async () => {
    const ctx = await fixture(Response.json({ access_token: 'a1' }))
    await expect(ctx.client.exchange('code-1')).rejects.toThrow(
      /no refresh token/,
    )
  })

  it('revokes a refresh token, accepting an empty body', async () => {
    const ctx = await fixture(new Response('', { status: 200 }))
    await ctx.client.revoke('r1')
    const { url, form } = ctx.sent()
    expect(url).toBe('https://appleid.apple.com/auth/revoke')
    expect(form.get('token')).toBe('r1')
    expect(form.get('token_type_hint')).toBe('refresh_token')
  })

  it('surfaces an Apple error status', async () => {
    const ctx = await fixture(new Response('{}', { status: 400 }))
    await expect(ctx.client.revoke('r1')).rejects.toThrow(/400/)
  })
})
