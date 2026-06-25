import { describe, expect, it } from 'vitest'
import { isMessageChannel } from '@/value-objects/message-channel'

describe('message channel', () => {
  it('recognizes supported channels', () => {
    expect(isMessageChannel('whatsapp')).toBe(true)
    expect(isMessageChannel('sms')).toBe(false)
  })
})
