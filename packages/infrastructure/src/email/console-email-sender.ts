import type { EmailSender } from '@taskin/application'

export class ConsoleEmailSender implements EmailSender {
  async sendVerificationCode(to: string, code: string): Promise<void> {
    console.info(`[taskin] verification code for ${to}: ${code}`)
  }
}
