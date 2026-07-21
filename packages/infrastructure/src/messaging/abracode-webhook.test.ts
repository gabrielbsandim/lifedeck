import { describe, expect, it } from 'vitest'
import { parseAbracodeInbound } from '@/messaging/abracode-webhook'

function received(data: Record<string, unknown>) {
  return { type: 'message.received', data }
}

describe('parseAbracodeInbound', () => {
  it('parses a text message', () => {
    expect(
      parseAbracodeInbound(
        received({
          from: '5511999998888',
          messageId: 'wamid.1',
          messageType: 'text',
          text: 'hi there',
        }),
      ),
    ).toEqual([
      {
        from: '5511999998888',
        messageId: 'wamid.1',
        kind: 'text',
        text: 'hi there',
      },
    ])
  })

  it('parses audio and image media handles', () => {
    expect(
      parseAbracodeInbound(
        received({
          from: '551199',
          messageId: 'wamid.2',
          messageType: 'audio',
          media: { id: 'media_a' },
        }),
      ),
    ).toEqual([
      {
        from: '551199',
        messageId: 'wamid.2',
        kind: 'audio',
        mediaId: 'media_a',
      },
    ])

    expect(
      parseAbracodeInbound(
        received({
          from: '551199',
          messageId: 'wamid.3',
          messageType: 'image',
          media: { id: 'media_i' },
        }),
      ),
    ).toEqual([
      {
        from: '551199',
        messageId: 'wamid.3',
        kind: 'image',
        mediaId: 'media_i',
      },
    ])
  })

  it('parses a tapped quick-reply button', () => {
    expect(
      parseAbracodeInbound(
        received({
          from: '551199',
          messageId: 'wamid.b',
          messageType: 'button',
          buttonReply: { id: 'nudge_no:task-9', title: 'Not today' },
        }),
      ),
    ).toEqual([
      {
        from: '551199',
        messageId: 'wamid.b',
        kind: 'button',
        buttonId: 'nudge_no:task-9',
        text: 'Not today',
      },
    ])
  })

  it('ignores non message.received events', () => {
    expect(
      parseAbracodeInbound({
        type: 'message.status',
        data: { messageId: 'x' },
      }),
    ).toEqual([])
  })

  it('skips messages missing sender or id, or of unsupported types', () => {
    expect(
      parseAbracodeInbound(
        received({ messageId: 'wamid.4', messageType: 'text', text: 'hi' }),
      ),
    ).toEqual([])
    expect(
      parseAbracodeInbound(
        received({
          from: '551199',
          messageId: 'wamid.5',
          messageType: 'video',
          media: { id: 'm' },
        }),
      ),
    ).toEqual([])
    expect(parseAbracodeInbound({ type: 'message.received' })).toEqual([])
  })
})
