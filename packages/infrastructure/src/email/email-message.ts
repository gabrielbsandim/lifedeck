export type EmailTemplate =
  | { type: 'verification-code'; data: { code: string; appName: string } }
  | { type: 'list-invitation'; data: { listTitle: string; url: string } }

export type RenderedEmail = {
  subject: string
  html: string
}

export interface EmailSender {
  send(to: string, template: EmailTemplate): Promise<void>
}
