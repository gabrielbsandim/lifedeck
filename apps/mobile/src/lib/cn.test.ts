import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/cn'

describe('cn', () => {
  it('joins the truthy class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('drops conditional and nullish values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
  })

  it('keeps order so later classes override earlier ones', () => {
    expect(cn('bg-bg', 'bg-surface')).toBe('bg-bg bg-surface')
  })
})
