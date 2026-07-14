// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  pairingDeepLink,
  pairingRequestSchema,
} from '@/server/api/pairing-link'

describe('pairingRequestSchema', () => {
  it('accepts and trims a phone string', () => {
    expect(
      pairingRequestSchema.parse({ phone: '  +55 11 99999-0000  ' }),
    ).toEqual({ phone: '+55 11 99999-0000' })
  })

  it('makes phone optional (same-device flow pairs by code alone)', () => {
    expect(pairingRequestSchema.parse({})).toEqual({})
    expect(pairingRequestSchema.parse({ phone: '   ' })).toEqual({ phone: '' })
  })
})

describe('pairingDeepLink', () => {
  beforeEach(() => {
    delete process.env.WHATSAPP_BOT_NUMBER
  })
  afterEach(() => {
    delete process.env.WHATSAPP_BOT_NUMBER
  })

  it('is null without a configured bot number', () => {
    expect(pairingDeepLink('123456')).toBeNull()
  })

  it('builds a wa.me link with the code as the message body', () => {
    process.env.WHATSAPP_BOT_NUMBER = '+55 11 5555-0000'
    expect(pairingDeepLink('123456')).toBe(
      'https://wa.me/551155550000?text=123456',
    )
  })
})
