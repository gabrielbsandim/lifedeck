import { describe, expect, it } from 'vitest'
import { isMemberRole } from '@/value-objects/member-role'

describe('isMemberRole', () => {
  it('recognizes valid roles', () => {
    expect(isMemberRole('owner')).toBe(true)
    expect(isMemberRole('editor')).toBe(true)
    expect(isMemberRole('viewer')).toBe(true)
  })

  it('rejects unknown roles', () => {
    expect(isMemberRole('admin')).toBe(false)
  })
})
