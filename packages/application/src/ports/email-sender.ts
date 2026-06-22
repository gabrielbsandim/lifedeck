export type EmailLocale = 'en' | 'pt'

export interface EmailSender {
  sendVerificationCode(
    to: string,
    code: string,
    locale?: EmailLocale,
  ): Promise<void>
  sendListInvitation(
    to: string,
    listTitle: string,
    url: string,
    locale?: EmailLocale,
  ): Promise<void>
  sendTaskAssignment(
    to: string,
    taskTitle: string,
    listTitle: string,
    locale?: EmailLocale,
  ): Promise<void>
}
