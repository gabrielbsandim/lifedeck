export type MediaPayload = {
  data: ArrayBuffer
  mimeType: string
}

export interface MessagingChannel {
  sendText(to: string, text: string): Promise<void>
  fetchMedia(mediaId: string): Promise<MediaPayload>
}
