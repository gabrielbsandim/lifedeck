import { Fragment, type ReactNode } from 'react'
import { COMPANY_CNPJ, COMPANY_EMAIL, COMPANY_NAME } from '@/lib/site'

const TOKENS: Record<string, string> = {
  company: COMPANY_NAME,
  cnpj: COMPANY_CNPJ,
}

// Matches **bold**, [label](href), and {token} (email | company | cnpj).
const PATTERN_SOURCE =
  '\\*\\*(.+?)\\*\\*|\\[(.+?)\\]\\((.+?)\\)|\\{(email|company|cnpj)\\}'

// Only allow same-origin paths and http(s)/mailto links; anything else
// (e.g. a javascript: scheme) renders as plain text.
function isSafeHref(href: string): boolean {
  return /^(\/|https?:\/\/|mailto:)/i.test(href)
}

export function renderRichText(text: string): ReactNode {
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let key = 0
  let match: RegExpExecArray | null

  // A fresh regex per call keeps lastIndex isolated across recursion.
  const pattern = new RegExp(PATTERN_SOURCE, 'g')
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }

    const [full, bold, linkLabel, linkHref, token] = match
    if (bold !== undefined) {
      nodes.push(<strong key={key++}>{renderRichText(bold)}</strong>)
    } else if (linkLabel !== undefined && linkHref !== undefined) {
      nodes.push(
        isSafeHref(linkHref) ? (
          <a key={key++} href={linkHref}>
            {linkLabel}
          </a>
        ) : (
          <span key={key++}>{linkLabel}</span>
        ),
      )
    } else if (token === 'email') {
      nodes.push(
        <a key={key++} href={`mailto:${COMPANY_EMAIL}`}>
          {COMPANY_EMAIL}
        </a>,
      )
    } else if (token !== undefined) {
      nodes.push(TOKENS[token])
    }

    lastIndex = match.index + full.length
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes.map((node, index) => <Fragment key={index}>{node}</Fragment>)
}
