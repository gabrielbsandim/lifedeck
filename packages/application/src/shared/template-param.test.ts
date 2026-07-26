import { describe, expect, it } from 'vitest'
import { toTemplateParam, toTemplateParams } from '@/shared/template-param'

describe('toTemplateParam', () => {
  it('flattens the line breaks WhatsApp rejects', () => {
    expect(toTemplateParam('☀️ Good morning!\n\nToday\n• Buy milk')).toBe(
      '☀️ Good morning! Today • Buy milk',
    )
  })

  it('collapses tabs and runs of spaces', () => {
    expect(toTemplateParam('a\t\tb     c')).toBe('a b c')
  })

  it('truncates at the 1024-character parameter limit', () => {
    const result = toTemplateParam('x'.repeat(2000))
    expect(result).toHaveLength(1024)
    expect(result.endsWith('…')).toBe(true)
  })

  it('leaves an already single-line param untouched', () => {
    expect(toTemplateParam('Dentist')).toBe('Dentist')
  })
})

describe('toTemplateParams', () => {
  it('maps every param', () => {
    expect(toTemplateParams(['a\nb', ' c '])).toEqual(['a b', 'c'])
  })
})
