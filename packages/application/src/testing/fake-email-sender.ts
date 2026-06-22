import type { EmailLocale, EmailSender } from '@/ports/email-sender'

export class FakeEmailSender implements EmailSender {
  readonly sent: Array<{ to: string; code: string; locale: EmailLocale }> = []
  readonly invitations: Array<{
    to: string
    listTitle: string
    url: string
    locale: EmailLocale
  }> = []

  async sendVerificationCode(
    to: string,
    code: string,
    locale: EmailLocale = 'en',
  ): Promise<void> {
    this.sent.push({ to, code, locale })
  }

  async sendListInvitation(
    to: string,
    listTitle: string,
    url: string,
    locale: EmailLocale = 'en',
  ): Promise<void> {
    this.invitations.push({ to, listTitle, url, locale })
  }
}
