import { Resend } from 'resend'
import type { EmailSender, EmailTemplate } from './email-message'
import { renderEmail } from './render-email'

export class ResendEmailSender implements EmailSender {
  private readonly client: Resend

  constructor(
    apiKey: string,
    private readonly from: string,
  ) {
    this.client = new Resend(apiKey)
  }

  async send(to: string, template: EmailTemplate): Promise<void> {
    const { subject, html } = renderEmail(template)
    await this.client.emails.send({ from: this.from, to, subject, html })
  }
}
