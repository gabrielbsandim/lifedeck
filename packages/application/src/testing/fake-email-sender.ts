import type {
  DailyDigestSummary,
  EmailLocale,
  EmailSender,
} from '@/ports/email-sender'

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

  readonly assignments: Array<{
    to: string
    taskTitle: string
    listTitle: string
    locale: EmailLocale
  }> = []

  async sendListInvitation(
    to: string,
    listTitle: string,
    url: string,
    locale: EmailLocale = 'en',
  ): Promise<void> {
    this.invitations.push({ to, listTitle, url, locale })
  }

  async sendTaskAssignment(
    to: string,
    taskTitle: string,
    listTitle: string,
    locale: EmailLocale = 'en',
  ): Promise<void> {
    this.assignments.push({ to, taskTitle, listTitle, locale })
  }

  readonly digests: Array<{
    to: string
    summary: DailyDigestSummary
    locale: EmailLocale
  }> = []

  async sendDailyDigest(
    to: string,
    summary: DailyDigestSummary,
    locale: EmailLocale = 'en',
  ): Promise<void> {
    this.digests.push({ to, summary, locale })
  }
}
