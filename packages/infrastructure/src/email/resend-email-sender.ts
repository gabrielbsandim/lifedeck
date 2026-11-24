import { Resend } from 'resend'
import type {
  BookingNotice,
  DailyDigestSummary,
  EmailLocale,
  EmailSender,
} from '@lifedeck/application'
import { renderBookingEmail } from '@/email/render-booking-email'
import { renderEmail } from '@/email/render-email'

export class ResendEmailSender implements EmailSender {
  private readonly client: Resend

  constructor(
    apiKey: string,
    private readonly from: string,
    private readonly appName = 'Lifedeck',
  ) {
    this.client = new Resend(apiKey)
  }

  private async send(
    to: string,
    subject: string,
    html: string,
    ics: string | null = null,
  ): Promise<void> {
    const { error } = await this.client.emails.send({
      from: this.from,
      to,
      subject,
      html,
      ...(ics
        ? {
            attachments: [
              {
                filename: 'invite.ics',
                content: Buffer.from(ics, 'utf8'),
                contentType: 'text/calendar; charset=utf-8',
              },
            ],
          }
        : {}),
    })
    if (error) {
      throw new Error(`Resend failed to send email: ${error.message}`)
    }
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
    await this.send(to, subject, html)
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
    await this.send(to, subject, html)
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
    await this.send(to, subject, html)
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
    await this.send(to, subject, html)
  }

  async sendEventReminder(
    to: string,
    eventTitle: string,
    startsAt: string,
    locale: EmailLocale = 'en',
    timeZone?: string,
  ): Promise<void> {
    const { subject, html } = renderEmail(
      { type: 'event-reminder', data: { eventTitle, startsAt, timeZone } },
      locale,
    )
    await this.send(to, subject, html)
  }

  async sendBookingNotice(
    to: string,
    notice: BookingNotice,
    locale: EmailLocale = 'en',
  ): Promise<void> {
    const { subject, html, ics } = renderBookingEmail(notice, locale)
    await this.send(to, subject, html, ics)
  }
}
