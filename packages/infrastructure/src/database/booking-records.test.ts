import { describe, expect, it } from 'vitest'
import {
  isSlotTakenViolation,
  toBookingClientRecord,
  toBookingPageRecord,
  toBookingRecord,
  toBookingServiceRecord,
  toCivilDate,
  toDomainBooking,
  toDomainBookingClient,
  toDomainBookingPage,
  toDomainBookingService,
  toDomainOverride,
  type BookingClientRecord,
  type BookingPageRecord,
  type BookingRecord,
  type BookingServiceRow,
} from '@/database/booking-records'

const NOW = new Date('2026-06-20T12:00:00.000Z')
const OWNER = '11111111-1111-4111-8111-111111111111'
const PAGE = '22222222-2222-4222-8222-222222222222'

const PAGE_RECORD: BookingPageRecord = {
  id: PAGE,
  ownerId: OWNER,
  slug: 'ana',
  displayName: 'Ana Lima',
  headline: null,
  timezone: 'America/Sao_Paulo',
  locale: 'pt',
  cancelNoticeMin: 60,
  active: true,
  createdAt: NOW,
  updatedAt: NOW,
}

const SERVICE_ROW: BookingServiceRow = {
  id: '33333333-3333-4333-8333-333333333333',
  ownerId: OWNER,
  pageId: PAGE,
  name: 'Private class',
  description: null,
  durationMin: 50,
  slotStepMin: 30,
  bufferBeforeMin: 0,
  bufferAfterMin: 10,
  minNoticeMin: 120,
  maxHorizonDays: 30,
  maxPerDay: null,
  location: { kind: 'online-link', url: 'https://zoom.us/j/1' },
  priceLabel: 'R$ 80',
  requiresApproval: false,
  active: true,
  position: 0,
  createdAt: NOW,
  updatedAt: NOW,
}

const CLIENT_RECORD: BookingClientRecord = {
  id: '44444444-4444-4444-8444-444444444444',
  ownerId: OWNER,
  name: 'João',
  email: 'joao@mail.com',
  phone: '+5511987654321',
  notes: null,
  createdAt: NOW,
  updatedAt: NOW,
}

const BOOKING_RECORD: BookingRecord = {
  id: '55555555-5555-4555-8555-555555555555',
  ownerId: OWNER,
  serviceId: SERVICE_ROW.id,
  clientId: CLIENT_RECORD.id,
  startsAt: new Date('2026-06-22T13:00:00.000Z'),
  endsAt: new Date('2026-06-22T13:50:00.000Z'),
  status: 'confirmed',
  source: 'public',
  calendarEventId: null,
  clientTimezone: 'Europe/Lisbon',
  note: null,
  cancelReason: null,
  createdAt: NOW,
  updatedAt: NOW,
}

describe('booking records', () => {
  it('round-trips a page, a service, a client and a booking', () => {
    expect(toBookingPageRecord(toDomainBookingPage(PAGE_RECORD))).toEqual(
      PAGE_RECORD,
    )
    expect(toBookingServiceRecord(toDomainBookingService(SERVICE_ROW))).toEqual(
      SERVICE_ROW,
    )
    expect(toBookingClientRecord(toDomainBookingClient(CLIENT_RECORD))).toEqual(
      CLIENT_RECORD,
    )
    expect(toBookingRecord(toDomainBooking(BOOKING_RECORD))).toEqual(
      BOOKING_RECORD,
    )
    const linked = { ...BOOKING_RECORD, calendarEventId: PAGE }
    expect(toDomainBooking(linked).calendarEventId).toBe(PAGE)
  })

  it('refuses a service row whose location JSON is broken', () => {
    expect(() =>
      toDomainBookingService({ ...SERVICE_ROW, location: null }),
    ).toThrow('Location')
    expect(() =>
      toDomainBookingService({
        ...SERVICE_ROW,
        location: { kind: 'online-link' },
      }),
    ).toThrow('Meeting link')
  })

  it('refuses a booking row with an unknown status or source', () => {
    expect(() =>
      toDomainBooking({ ...BOOKING_RECORD, status: 'lost' }),
    ).toThrow('lost/public')
    expect(() =>
      toDomainBooking({ ...BOOKING_RECORD, source: 'email' }),
    ).toThrow('confirmed/email')
  })

  it('reads an override from its civil date and JSON windows', () => {
    const date = toCivilDate('2026-12-24')
    expect(date.toISOString()).toBe('2026-12-24T00:00:00.000Z')
    expect(
      toDomainOverride({
        date,
        windows: [{ startMinute: 480, endMinute: 720 }],
      }),
    ).toEqual({
      date: '2026-12-24',
      windows: [{ startMinute: 480, endMinute: 720 }],
    })
    expect(toDomainOverride({ date, windows: null }).windows).toEqual([])
  })

  it('recognizes the exclusion violation and nothing else', () => {
    expect(
      isSlotTakenViolation(
        new Error('violates exclusion constraint "bookings_no_overlap"'),
      ),
    ).toBe(true)
    expect(isSlotTakenViolation(new Error('code: 23P01'))).toBe(true)
    expect(isSlotTakenViolation(new Error('unique constraint'))).toBe(false)
    expect(isSlotTakenViolation('23P01')).toBe(false)
  })
})
