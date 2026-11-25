import { describe, expect, it } from 'vitest'
import { parseChatText } from '@/chat-text'

describe('parseChatText', () => {
  it('keeps plain lines as one span each', () => {
    expect(parseChatText('Hi\n\nThere')).toEqual([
      { bullet: false, spans: [{ text: 'Hi', bold: false }] },
      { bullet: false, spans: [] },
      { bullet: false, spans: [{ text: 'There', bold: false }] },
    ])
  })

  it('turns star, dash and dot markers into bullets', () => {
    const lines = parseChatText('* one\n- two\n  • three')
    expect(lines.map(line => line.bullet)).toEqual([true, true, true])
    expect(lines.map(line => line.spans[0]?.text)).toEqual([
      'one',
      'two',
      'three',
    ])
  })

  it('reads WhatsApp and Markdown bold', () => {
    expect(parseChatText('Do *this* and **that** now')[0]?.spans).toEqual([
      { text: 'Do ', bold: false },
      { text: 'this', bold: true },
      { text: ' and ', bold: false },
      { text: 'that', bold: true },
      { text: ' now', bold: false },
    ])
  })

  it('leaves a lone or spaced asterisk alone', () => {
    expect(parseChatText('5 * 3 = 15')[0]?.spans).toEqual([
      { text: '5 * 3 = 15', bold: false },
    ])
  })
})
