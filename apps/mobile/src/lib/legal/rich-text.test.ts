import { describe, expect, it } from 'vitest'
import { messages } from '@lifedeck/i18n'
import {
  COMPANY_CNPJ,
  COMPANY_EMAIL,
  COMPANY_NAME,
  parseRichText,
} from '@/lib/legal/rich-text'

const SITE = 'https://lifedeck.test'

describe('parseRichText', () => {
  it('returns plain text untouched', () => {
    expect(parseRichText('Hello.', SITE)).toEqual([
      { kind: 'text', text: 'Hello.' },
    ])
  })

  it('splits bold runs and keeps the text around them', () => {
    expect(parseRichText('a **b** c', SITE)).toEqual([
      { kind: 'text', text: 'a ' },
      { kind: 'bold', children: [{ kind: 'text', text: 'b' }] },
      { kind: 'text', text: ' c' },
    ])
  })

  it('resolves site paths against the web origin and keeps safe links', () => {
    expect(parseRichText('[Privacy](/privacy)', SITE)).toEqual([
      { kind: 'link', text: 'Privacy', href: `${SITE}/privacy` },
    ])
    expect(parseRichText('[Mail](mailto:a@b.c)', SITE)).toEqual([
      { kind: 'link', text: 'Mail', href: 'mailto:a@b.c' },
    ])
  })

  it('degrades an unsafe scheme to plain text', () => {
    expect(parseRichText('[x](javascript:alert(1))', SITE)[0]).toEqual({
      kind: 'text',
      text: 'x',
    })
  })

  it('fills the company tokens', () => {
    expect(parseRichText('{company} {cnpj} {email}', SITE)).toEqual([
      { kind: 'text', text: COMPANY_NAME },
      { kind: 'text', text: ' ' },
      { kind: 'text', text: COMPANY_CNPJ },
      { kind: 'text', text: ' ' },
      {
        kind: 'link',
        text: COMPANY_EMAIL,
        href: `mailto:${COMPANY_EMAIL}`,
      },
    ])
  })

  it('parses every legal paragraph without leaving markup behind', () => {
    const texts = (['terms', 'privacy'] as const).flatMap(doc => {
      const content = messages.pt.legal[doc]
      return [
        content.intro,
        ...content.sections.flatMap(section =>
          section.blocks.flatMap(block =>
            block.kind === 'p' ? [block.text] : block.items,
          ),
        ),
      ]
    })
    const flatten = (segments: ReturnType<typeof parseRichText>): string =>
      segments
        .map(segment =>
          segment.kind === 'bold' ? flatten(segment.children) : segment.text,
        )
        .join('')
    for (const text of texts) {
      expect(flatten(parseRichText(text, SITE))).not.toMatch(
        /\*\*|\]\(|\{email\}/,
      )
    }
  })
})
