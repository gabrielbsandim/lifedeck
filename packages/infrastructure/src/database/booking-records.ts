import {
  Booking,
  BookingClient,
  BookingPage,
  BookingService,
  asEntityId,
  isBookingSource,
  isBookingStatus,
  validateAvailabilityOverride,
  validateBookingLocation,
  type AvailabilityOverride,
  type BookingLocation,
  type DayWindow,
} from '@lifedeck/domain'

export type BookingPageRecord = {
  id: string
  ownerId: string
  slug: string
  displayName: string
  headline: string | null
  timezone: string
  locale: string
  cancelNoticeMin: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export function toDomainBookingPage(record: BookingPageRecord): BookingPage {
  return BookingPage.restore({
    ...record,
    id: asEntityId(record.id),
    ownerId: asEntityId(record.ownerId),
  })
}

export function toBookingPageRecord(page: BookingPage): BookingPageRecord {
  return { ...page.toJSON() }
}

type ServiceColumns = {
  id: string
  ownerId: string
  pageId: string
  name: string
  description: string | null
  durationMin: number
  slotStepMin: number
  bufferBeforeMin: number
  bufferAfterMin: number
  minNoticeMin: number
  maxHorizonDays: number
  maxPerDay: number | null
  priceLabel: string | null
  requiresApproval: boolean
  active: boolean
  position: number
  createdAt: Date
  updatedAt: Date
}

export type BookingServiceRow = ServiceColumns & { location: unknown }
export type BookingServiceRecord = ServiceColumns & {
  location: BookingLocation
}

// JSON columns are re-validated on read, so a bad row fails loudly here and
// not deep inside slot math.
function readLocation(value: unknown): BookingLocation {
  const raw = (value ?? {}) as {
    kind?: string
    url?: string | null
    address?: string | null
  }
  return validateBookingLocation({ ...raw, kind: raw.kind ?? '' })
}

export function toDomainBookingService(row: BookingServiceRow): BookingService {
  return BookingService.restore({
    ...row,
    id: asEntityId(row.id),
    ownerId: asEntityId(row.ownerId),
    pageId: asEntityId(row.pageId),
    location: readLocation(row.location),
  })
}

export function toBookingServiceRecord(
  service: BookingService,
): BookingServiceRecord {
  return { ...service.toJSON() }
}

export type BookingClientRecord = {
  id: string
  ownerId: string
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export function toDomainBookingClient(
  record: BookingClientRecord,
): BookingClient {
  return BookingClient.restore({
    ...record,
    id: asEntityId(record.id),
    ownerId: asEntityId(record.ownerId),
  })
}

export function toBookingClientRecord(
  client: BookingClient,
): BookingClientRecord {
  return { ...client.toJSON() }
}

export type BookingRecord = {
  id: string
  ownerId: string
  serviceId: string
  clientId: string
  startsAt: Date
  endsAt: Date
  status: string
  source: string
  calendarEventId: string | null
  clientTimezone: string | null
  note: string | null
  cancelReason: string | null
  createdAt: Date
  updatedAt: Date
}

export function toDomainBooking(record: BookingRecord): Booking {
  const { status, source } = record
  if (!isBookingStatus(status) || !isBookingSource(source)) {
    throw new Error(`Booking ${record.id} has status ${status}/${source}.`)
  }
  return Booking.restore({
    ...record,
    id: asEntityId(record.id),
    ownerId: asEntityId(record.ownerId),
    serviceId: asEntityId(record.serviceId),
    clientId: asEntityId(record.clientId),
    calendarEventId:
      record.calendarEventId === null
        ? null
        : asEntityId(record.calendarEventId),
    status,
    source,
  })
}

export function toBookingRecord(booking: Booking): BookingRecord {
  return { ...booking.toJSON() }
}

export type AvailabilityOverrideRow = { date: Date; windows: unknown }

export function toCivilDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`)
}

export function toDomainOverride(
  row: AvailabilityOverrideRow,
): AvailabilityOverride {
  return validateAvailabilityOverride({
    date: row.date.toISOString().slice(0, 10),
    windows: Array.isArray(row.windows) ? (row.windows as DayWindow[]) : [],
  })
}

// Prisma has no error code for an exclusion violation; the Postgres code and
// the constraint name both survive in the message.
export function isSlotTakenViolation(error: unknown): boolean {
  return (
    error instanceof Error && /23P01|bookings_no_overlap/.test(error.message)
  )
}
