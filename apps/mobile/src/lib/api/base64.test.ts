import { describe, expect, it } from 'vitest'
import { base64ToBytes } from '@/lib/api/base64'

describe('base64ToBytes', () => {
  it('decodes to the original bytes', () => {
    // "Life" as base64; the avatar upload sends exactly these raw bytes.
    expect(Array.from(base64ToBytes('TGlmZQ=='))).toEqual([76, 105, 102, 101])
  })

  it('handles bytes above the ASCII range', () => {
    const bytes = base64ToBytes(
      Buffer.from(Uint8Array.from([0, 127, 128, 255])).toString('base64'),
    )
    expect(Array.from(bytes)).toEqual([0, 127, 128, 255])
  })

  it('returns an empty array for an empty string', () => {
    expect(base64ToBytes('')).toHaveLength(0)
  })
})
