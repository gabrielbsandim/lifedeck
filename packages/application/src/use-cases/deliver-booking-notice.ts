import { asEntityId, toMessageLanguage } from '@lifedeck/domain'
import { z } from 'zod'
import type { BookingRepository } from '@/ports/booking-repository'
import type { Clock } from '@/ports/clock'
import { toEmailLocale } from '@/ports/email-sender'
import type { IdGenerator } from '@/ports/id-generator'
import type { UserRepository } from '@/ports/user-repository'
import type { BookingMailer, BookingParts } from '@/shared/booking-notice'
import { formatEventTime } from '@/shared/format-event-time'
import type { makePublishNotification } from '@/shared/publish-notification'
import { pushTitles } from '@/shared/push-text'

const payloadSchema = z.object({
  bookingId: z.string(),
  kind: z.enum([
    'requested',
    'confirmed',
    'declined',
    'cancelled',
    'rescheduled',
  ]),
  byClient: z.boolean(),
  calendarStale: z.boolean().optional(),
})

type HostKind = 'requested' | 'confirmed' | 'cancelled' | 'rescheduled'

const TITLE_KEY = {
  requested: 'bookingRequested',
  confirmed: 'bookingConfirmed',
  cancelled: 'bookingCancelled',
  rescheduled: 'bookingRescheduled',
} as const

function isHostKind(kind: string): kind is HostKind {
  return kind in TITLE_KEY
}

type Dependencies = {
  bookings: Pick<BookingRepository, 'findById'>
  users: Pick<UserRepository, 'findById'>
  mailer: BookingMailer
  publishNotification: ReturnType<typeof makePublishNotification>
  ids: IdGenerator
  clock: Clock
}

/**
 * Job handler: emails the client about a change, and tells the host in the
 * bell and on the phone when the client made it. Re-reads the booking, so a
 * booking deleted with its owner is skipped.
 */
export function makeDeliverBookingNotice({
  bookings,
  users,
  mailer,
  publishNotification,
  ids,
  clock,
}: Dependencies) {
  async function tellHost(
    kind: HostKind,
    parts: BookingParts,
    bookingId: string,
    startsAt: Date,
    calendarStale: boolean,
  ): Promise<void> {
    const host = await users.findById(parts.page.ownerId)
    const locale = toEmailLocale(host?.locale ?? parts.page.locale)
    const when = formatEventTime(
      startsAt.toISOString(),
      locale,
      host?.timezone ?? parts.page.timezone,
    )
    await publishNotification({
      id: ids.generate(),
      userId: parts.page.ownerId,
      type: `booking-${kind}`,
      data: {
        bookingId,
        clientName: parts.client.name,
        serviceName: parts.service.name,
        startsAt: startsAt.toISOString(),
        calendarStale: String(calendarStale),
      },
      createdAt: clock.now(),
      alert: {
        title: pushTitles(toMessageLanguage(locale))[TITLE_KEY[kind]],
        body: `${parts.client.name} · ${parts.service.name} · ${when}`,
      },
    })
  }

  return async function deliverBookingNotice(
    raw: Record<string, unknown>,
  ): Promise<void> {
    const payload = payloadSchema.parse(raw)
    const booking = await bookings.findById(asEntityId(payload.bookingId))
    const parts = booking ? await mailer.partsOf(booking) : null
    if (!booking || !parts) {
      return
    }
    await mailer.sendToClient(booking, payload.kind, parts)
    if (!payload.byClient || !isHostKind(payload.kind)) {
      return
    }
    await tellHost(
      payload.kind,
      parts,
      payload.bookingId,
      booking.startsAt,
      payload.calendarStale === true,
    )
  }
}
