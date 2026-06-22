import { Resend } from 'resend'
import type {
  DailyDigestSummary,
  EmailLocale,
  EmailSender,
} from '@taskin/application'
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

  async sendVerificationCode(
    to: string,
    code: string,
    locale: EmailLocale = 'en',
  ): Promise<void> {
    const { subject, html } = renderEmail(
      { type: 'verification-code', data: { code, appName: this.appName } },
      locale,
    )
    await this.client.emails.send({ from: this.from, to, subject, html })
  }

  async sendListInvitation(
    to: string,
    listTitle: string,
    url: string,
    locale: EmailLocale = 'en',
  ): Promise<void> {
    const { subject, html } = renderEmail(
      { type: 'list-invitation', data: { listTitle, url } },
      locale,
    )
    await this.client.emails.send({ from: this.from, to, subject, html })
  }

  async sendTaskAssignment(
    to: string,
    taskTitle: string,
    listTitle: string,
    locale: EmailLocale = 'en',
  ): Promise<void> {
    const { subject, html } = renderEmail(
      { type: 'task-assignment', data: { taskTitle, listTitle } },
      locale,
    )
    await this.client.emails.send({ from: this.from, to, subject, html })
  }

  async sendDailyDigest(
    to: string,
    summary: DailyDigestSummary,
    locale: EmailLocale = 'en',
  ): Promise<void> {
    const { subject, html } = renderEmail(
      { type: 'daily-digest', data: summary },
      locale,
    )
    await this.client.emails.send({ from: this.from, to, subject, html })
  }
}
