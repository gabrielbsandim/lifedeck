import type { EmailSender } from '@/ports/email-sender'

export class FakeEmailSender implements EmailSender {
  readonly sent: Array<{ to: string; code: string }> = []

  async sendVerificationCode(to: string, code: string): Promise<void> {
    this.sent.push({ to, code })
  }
}
