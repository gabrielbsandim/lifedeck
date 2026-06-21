import { describe, expect, it } from 'vitest'
import { isListType } from '@/value-objects/list-type'

describe('isListType', () => {
  it('recognizes valid types', () => {
    expect(isListType('daily')).toBe(true)
    expect(isListType('standalone')).toBe(true)
  })

  it('rejects unknown types', () => {
    expect(isListType('weekly')).toBe(false)
  })
})
