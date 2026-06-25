export const MESSAGE_CHANNELS = ['whatsapp'] as const

export type MessageChannel = (typeof MESSAGE_CHANNELS)[number]

export function isMessageChannel(value: string): value is MessageChannel {
  return (MESSAGE_CHANNELS as readonly string[]).includes(value)
}
