import type { EmailLocale, EmailSender } from '@taskin/application'

export class ConsoleEmailSender implements EmailSender {
  async sendVerificationCode(
    to: string,
    code: string,
    locale: EmailLocale = 'en',
  ): Promise<void> {
    console.info(`[taskin] verification code for ${to} (${locale}): ${code}`)
  }
}
