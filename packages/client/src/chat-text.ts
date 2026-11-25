export type ChatSpan = { text: string; bold: boolean }

export type ChatLine = { bullet: boolean; spans: ChatSpan[] }

const BULLET = /^\s*[*\-•]\s+/
const BOLD = /\*\*(.+?)\*\*|\*(\S(?:.*?\S)?)\*/g

function spansOf(text: string): ChatSpan[] {
  const spans: ChatSpan[] = []
  let last = 0
  for (const match of text.matchAll(BOLD)) {
    if (match.index > last) {
      spans.push({ text: text.slice(last, match.index), bold: false })
    }
    spans.push({ text: match[1] ?? match[2] ?? '', bold: true })
    last = match.index + match[0].length
  }
  if (last < text.length) {
    spans.push({ text: text.slice(last), bold: false })
  }
  return spans
}

// The assistant's prompt is shared with WhatsApp, so replies carry its markup
// ("* item", "*bold*"); chat screens render it instead of the raw asterisks.
export function parseChatText(text: string): ChatLine[] {
  return text.split('\n').map(line => {
    const bullet = BULLET.test(line)
    return { bullet, spans: spansOf(bullet ? line.replace(BULLET, '') : line) }
  })
}
