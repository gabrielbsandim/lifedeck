import { Resend } from 'resend'
import type { EmailSender } from '@taskin/application'
import { renderEmail } from '@/email/render-email'

export class ResendEmailSender implements EmailSender {
  private readonly client: Resend

  constructor(
    apiKey: string,
    private readonly from: string,
    private readonly appName = 'TaskIn',
  ) {
    this.client = new Resend(apiKey)
  }

  async sendVerificationCode(to: string, code: string): Promise<void> {
    const { subject, html } = renderEmail({
      type: 'verification-code',
      data: { code, appName: this.appName },
    })
    await this.client.emails.send({ from: this.from, to, subject, html })
  }
}
