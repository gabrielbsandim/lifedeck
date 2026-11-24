import {
  toMessageLanguage,
  type BookingLocation,
  type MessageLanguage,
} from '@lifedeck/domain'

export type EmailLocale = MessageLanguage

export function toEmailLocale(locale: string): EmailLocale {
  return toMessageLanguage(locale)
}

export type BookingNoticeKind =
  | 'requested'
  | 'confirmed'
  | 'declined'
  | 'cancelled'
  | 'rescheduled'
  | 'reminder'

export type BookingNotice = {
  kind: BookingNoticeKind
  bookingId: string
  serviceName: string
  hostName: string
  clientName: string
  startsAt: Date
  endsAt: Date
  timeZone: string
  location: BookingLocation
  // The Google Meet link once Google created it; null for other places.
  meetingUrl: string | null
  manageUrl: string | null
  reason: string | null
  // Grows with every change so calendar apps replace the earlier invite.
  sequence: number
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
  sendEventReminder(
    to: string,
    eventTitle: string,
    startsAt: string,
    locale?: EmailLocale,
    timeZone?: string,
  ): Promise<void>
  sendBookingNotice(
    to: string,
    notice: BookingNotice,
    locale?: EmailLocale,
  ): Promise<void>
}
