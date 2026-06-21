import { describe, expect, it } from 'vitest'
import { UuidGenerator } from '@/id/uuid-generator'

describe('UuidGenerator', () => {
  it('generates distinct valid entity ids', () => {
    const generator = new UuidGenerator()
    const a = generator.generate()
    const b = generator.generate()
    expect(a).not.toBe(b)
    expect(a).toMatch(/^[0-9a-f-]{36}$/i)
  })
})
