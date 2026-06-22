export type EmailTemplate =
  | { type: 'verification-code'; data: { code: string; appName: string } }
  | { type: 'list-invitation'; data: { listTitle: string; url: string } }

export type RenderedEmail = {
  subject: string
  html: string
}
