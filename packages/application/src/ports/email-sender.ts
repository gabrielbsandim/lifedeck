export type EmailLocale = 'en' | 'pt' | 'es'

export function toEmailLocale(locale: string): EmailLocale {
  if (locale === 'pt') {
    return 'pt'
  }
  if (locale === 'es') {
    return 'es'
  }
  return 'en'
}

export type DailyDigestSummary = {
  date: string
  total: number
  completed: number
  pendingTitles: string[]
}

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
  sendDailyDigest(
    to: string,
    summary: DailyDigestSummary,
    locale?: EmailLocale,
  ): Promise<void>
}
