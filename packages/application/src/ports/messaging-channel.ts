export type MediaPayload = {
  data: ArrayBuffer
  mimeType: string
}

export type MessageTemplate = {
  name: string
  language: string
  params: string[]
}

export interface MessagingChannel {
  sendText(to: string, text: string): Promise<void>
  sendTemplate(to: string, template: MessageTemplate): Promise<void>
  fetchMedia(mediaId: string): Promise<MediaPayload>
}
