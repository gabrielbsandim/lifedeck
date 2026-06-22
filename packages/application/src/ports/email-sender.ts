export type EmailLocale = 'en' | 'pt'

export interface EmailSender {
  sendVerificationCode(
    to: string,
    code: string,
    locale?: EmailLocale,
  ): Promise<void>
}
