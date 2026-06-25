import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  parseInboundMessages,
  verifyWhatsAppSignature,
} from '@/messaging/whatsapp-webhook'

const SECRET = 'app-secret'

function sign(body: string): string {
  return `sha256=${createHmac('sha256', SECRET).update(body).digest('hex')}`
}

describe('verifyWhatsAppSignature', () => {
  it('accepts a correct sha256 signature', () => {
    const body = '{"hello":"world"}'
    expect(verifyWhatsAppSignature(body, sign(body), SECRET)).toBe(true)
  })

  it('rejects a tampered body', () => {
    const body = '{"hello":"world"}'
    expect(verifyWhatsAppSignature('{"hello":"x"}', sign(body), SECRET)).toBe(
      false,
    )
  })

  it('rejects a missing or malformed header', () => {
    expect(verifyWhatsAppSignature('{}', null, SECRET)).toBe(false)
    expect(verifyWhatsAppSignature('{}', 'md5=abc', SECRET)).toBe(false)
  })

  it('fails closed when the app secret is unset', () => {
    const body = '{}'
    // An attacker who assumes an empty secret could otherwise forge this.
    const forged = `sha256=${createHmac('sha256', '').update(body).digest('hex')}`
    expect(verifyWhatsAppSignature(body, forged, '')).toBe(false)
  })
})

describe('parseInboundMessages', () => {
  it('extracts text messages from a webhook payload', () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    from: '5511999990000',
                    id: 'wamid.1',
                    type: 'text',
                    text: { body: 'hello' },
                  },
                  { from: '5511999990000', id: 'wamid.2', type: 'image' },
                ],
              },
            },
          ],
        },
      ],
    }
    expect(parseInboundMessages(payload)).toEqual([
      { from: '5511999990000', text: 'hello', messageId: 'wamid.1' },
    ])
  })

  it('returns an empty list for a status-only payload', () => {
    expect(
      parseInboundMessages({ entry: [{ changes: [{ value: {} }] }] }),
    ).toEqual([])
  })
})
