import { describe, expect, it } from 'vitest'
import { isVisibility } from '@/value-objects/visibility'

describe('isVisibility', () => {
  it('recognizes valid visibilities', () => {
    expect(isVisibility('private')).toBe(true)
    expect(isVisibility('link')).toBe(true)
  })

  it('rejects unknown visibilities', () => {
    expect(isVisibility('public')).toBe(false)
  })
})
