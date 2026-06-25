export interface MessagingChannel {
  sendText(to: string, text: string): Promise<void>
}
