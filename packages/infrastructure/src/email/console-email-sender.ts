import type { EmailLocale, EmailSender } from '@taskin/application'

export class ConsoleEmailSender implements EmailSender {
  async sendVerificationCode(
    to: string,
    code: string,
    locale: EmailLocale = 'en',
  ): Promise<void> {
    console.info(`[taskin] verification code for ${to} (${locale}): ${code}`)
  }

  async sendListInvitation(
    to: string,
    listTitle: string,
    url: string,
    locale: EmailLocale = 'en',
  ): Promise<void> {
    console.info(
      `[taskin] invitation to "${listTitle}" for ${to} (${locale}): ${url}`,
    )
  }

  async sendTaskAssignment(
    to: string,
    taskTitle: string,
    listTitle: string,
    locale: EmailLocale = 'en',
  ): Promise<void> {
    console.info(
      `[taskin] assignment "${taskTitle}" on "${listTitle}" for ${to} (${locale})`,
    )
  }
}
