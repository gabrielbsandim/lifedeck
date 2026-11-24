// The legal copy in @lifedeck/i18n carries a tiny markup: **bold**,
// [label](href) and {email|company|cnpj}. This splits it into segments a
// native Text tree can render. Same grammar as the web's rich-text.tsx.
export const COMPANY_NAME = 'GBS Tecnologia da Informação Ltda'
export const COMPANY_CNPJ = '44.000.992/0001-22'
export const COMPANY_EMAIL = 'contato@lifedeck.com.br'

export type RichSegment =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; children: RichSegment[] }
  | { kind: 'link'; text: string; href: string }

const TOKENS: Record<'company' | 'cnpj' | 'email', RichSegment> = {
  company: { kind: 'text', text: COMPANY_NAME },
  cnpj: { kind: 'text', text: COMPANY_CNPJ },
  email: { kind: 'link', text: COMPANY_EMAIL, href: `mailto:${COMPANY_EMAIL}` },
}

const PATTERN_SOURCE =
  '\\*\\*(.+?)\\*\\*|\\[(.+?)\\]\\((.+?)\\)|\\{(email|company|cnpj)\\}'

// Relative paths point at the web site; anything that is not http(s), mailto
// or a path (a javascript: scheme, say) degrades to plain text.
function linkSegment(text: string, href: string, siteUrl: string): RichSegment {
  if (href.startsWith('/')) {
    return { kind: 'link', text, href: `${siteUrl}${href}` }
  }
  if (/^(https?:\/\/|mailto:)/i.test(href)) {
    return { kind: 'link', text, href }
  }
  return { kind: 'text', text }
}

export function parseRichText(text: string, siteUrl: string): RichSegment[] {
  const segments: RichSegment[] = []
  const pattern = new RegExp(PATTERN_SOURCE, 'g')
  let lastIndex = 0
  for (const match of text.matchAll(pattern)) {
    const [full, bold, linkLabel, linkHref, token] = match
    const index = match.index
    if (index > lastIndex) {
      segments.push({ kind: 'text', text: text.slice(lastIndex, index) })
    }
    segments.push(segmentFor({ bold, linkLabel, linkHref, token }, siteUrl))
    lastIndex = index + full.length
  }
  if (lastIndex < text.length) {
    segments.push({ kind: 'text', text: text.slice(lastIndex) })
  }
  return segments
}

function segmentFor(
  parts: {
    bold?: string
    linkLabel?: string
    linkHref?: string
    token?: string
  },
  siteUrl: string,
): RichSegment {
  if (parts.bold !== undefined) {
    return { kind: 'bold', children: parseRichText(parts.bold, siteUrl) }
  }
  if (parts.linkLabel !== undefined && parts.linkHref !== undefined) {
    return linkSegment(parts.linkLabel, parts.linkHref, siteUrl)
  }
  return TOKENS[parts.token as keyof typeof TOKENS]
}
