export type MediaPayload = {
  data: ArrayBuffer
  mimeType: string
}

export type MessageTemplate = {
  name: string
  language: string
  params: string[]
}

// A tappable quick-reply button. `id` is echoed back verbatim in the button
// reply webhook (so the caller can encode intent + target there), while `title`
// is the visible label. WhatsApp caps a message at three buttons and each title
// at 20 characters.
export type InteractiveButton = {
  id: string
  title: string
}

export interface MessagingChannel {
  sendText(to: string, text: string): Promise<void>
  sendTemplate(to: string, template: MessageTemplate): Promise<void>
  // Free-form message with up to three quick-reply buttons. Only valid inside
  // the 24h customer-service window (WhatsApp rejects interactive messages once
  // it closes), so callers fall back to text/template when the window is shut.
  sendButtons(
    to: string,
    body: string,
    buttons: InteractiveButton[],
  ): Promise<void>
  fetchMedia(mediaId: string): Promise<MediaPayload>
}
