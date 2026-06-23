import type {
  DailyDigestSummary,
  EmailLocale,
  EmailSender,
} from '@lifedeck/application'

export class ConsoleEmailSender implements EmailSender {
  async sendVerificationCode(
    to: string,
    code: string,
    locale: EmailLocale = 'en',
  ): Promise<void> {
    console.info(`[lifedeck] verification code for ${to} (${locale}): ${code}`)
  }

  async sendListInvitation(
    to: string,
    listTitle: string,
    url: string,
    locale: EmailLocale = 'en',
  ): Promise<void> {
    console.info(
      `[lifedeck] invitation to "${listTitle}" for ${to} (${locale}): ${url}`,
    )
  }

  async sendTaskAssignment(
    to: string,
    taskTitle: string,
    listTitle: string,
    locale: EmailLocale = 'en',
  ): Promise<void> {
    console.info(
      `[lifedeck] assignment "${taskTitle}" on "${listTitle}" for ${to} (${locale})`,
    )
  }

  async sendDailyDigest(
    to: string,
    summary: DailyDigestSummary,
    locale: EmailLocale = 'en',
  ): Promise<void> {
    console.info(
      `[lifedeck] digest for ${to} (${locale}): ${summary.completed}/${summary.total} done on ${summary.date}`,
    )
  }
}
