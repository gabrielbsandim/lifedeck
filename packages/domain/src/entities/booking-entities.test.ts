import { describe, expect, it } from 'vitest'
import { ValidationError } from '@/shared/domain-error'
import { asEntityId } from '@/shared/id'
import { Booking } from '@/entities/booking'
import { BookingClient } from '@/entities/booking-client'
import { BookingPage } from '@/entities/booking-page'
import { BookingService } from '@/entities/booking-service'

const NOW = new Date('2026-06-20T12:00:00.000Z')
const LATER = new Date('2026-06-21T12:00:00.000Z')
const OWNER = asEntityId('11111111-1111-4111-8111-111111111111')
const OTHER = asEntityId('22222222-2222-4222-8222-222222222222')
const id = (n: number) =>
  asEntityId(`33333333-3333-4333-8333-${String(n).padStart(12, '0')}`)

function page() {
  return BookingPage.create({
    id: id(1),
    ownerId: OWNER,
    slug: 'Ana',
    displayName: ' Ana Lima ',
    headline: '  ',
    timezone: 'America/Sao_Paulo',
    locale: 'pt',
    now: NOW,
  })
}

describe('BookingPage', () => {
  it('creates an active page with clean fields', () => {
    const created = page()
    expect(created.toJSON()).toMatchObject({
      slug: 'ana',
      displayName: 'Ana Lima',
      headline: null,
      cancelNoticeMin: 0,
      active: true,
    })
    expect(created.isOwnedBy(OWNER)).toBe(true)
    expect(created.isOwnedBy(OTHER)).toBe(false)
    expect([created.id, created.ownerId]).toEqual([id(1), OWNER])
    expect([created.timezone, created.locale]).toEqual([
      'America/Sao_Paulo',
      'pt',
    ])
  })

  it('updates only the given fields and validates them', () => {
    const edited = page()
    edited.update(
      {
        slug: 'ana-lima',
        displayName: 'Ana L.',
        headline: 'English classes',
        timezone: 'UTC',
        locale: 'en',
        cancelNoticeMin: 1440,
      },
      LATER,
    )
    expect(edited.toJSON()).toMatchObject({
      slug: 'ana-lima',
      headline: 'English classes',
      timezone: 'UTC',
      cancelNoticeMin: 1440,
      updatedAt: LATER,
    })
    expect([edited.slug, edited.displayName, edited.headline]).toEqual([
      'ana-lima',
      'Ana L.',
      'English classes',
    ])
    expect(edited.cancelNoticeMin).toBe(1440)
    edited.update({}, LATER)
    expect(edited.slug).toBe('ana-lima')
    expect(() => edited.update({ timezone: 'Mars/Base' }, LATER)).toThrow(
      'Time zone',
    )
    expect(() => edited.update({ cancelNoticeMin: -1 }, LATER)).toThrow(
      ValidationError,
    )
    expect(edited.timezone).toBe('UTC')
  })

  it('can be switched off and restored as is', () => {
    const switched = page()
    switched.setActive(false, LATER)
    expect(switched.active).toBe(false)
    expect(BookingPage.restore(switched.toJSON()).toJSON()).toEqual(
      switched.toJSON(),
    )
  })
})

function service(
  overrides: Partial<Parameters<typeof BookingService.create>[0]> = {},
) {
  return BookingService.create({
    id: id(2),
    ownerId: OWNER,
    pageId: id(1),
    name: 'Private class',
    durationMin: 50,
    location: { kind: 'online-meet' },
    position: 0,
    now: NOW,
    ...overrides,
  })
}

describe('BookingService', () => {
  it('applies the defaults', () => {
    const created = service()
    expect(created.toJSON()).toMatchObject({
      slotStepMin: 30,
      bufferBeforeMin: 0,
      bufferAfterMin: 0,
      minNoticeMin: 120,
      maxHorizonDays: 30,
      maxPerDay: null,
      description: null,
      priceLabel: null,
      requiresApproval: false,
      active: true,
    })
    expect([created.id, created.ownerId, created.pageId]).toEqual([
      id(2),
      OWNER,
      id(1),
    ])
    expect([created.name, created.durationMin, created.position]).toEqual([
      'Private class',
      50,
      0,
    ])
    expect(created.location).toEqual({ kind: 'online-meet' })
    expect(created.requiresApproval).toBe(false)
    expect(created.isOwnedBy(OTHER)).toBe(false)
  })

  it.each([
    { durationMin: 0 },
    { durationMin: 12.5 },
    { slotStepMin: 241 },
    { bufferAfterMin: -5 },
    { maxHorizonDays: 0 },
    { maxPerDay: 0 },
    { minNoticeMin: 50_000 },
  ])('rejects %o', bad => {
    expect(() => service(bad)).toThrow(ValidationError)
  })

  it('replaces settings on update, archives and moves', () => {
    const edited = service()
    edited.update(
      {
        name: 'Trial class',
        description: ' First lesson ',
        durationMin: 30,
        maxPerDay: 3,
        priceLabel: 'R$ 80',
        requiresApproval: true,
        location: { kind: 'in-person', address: 'Rua A, 1' },
      },
      LATER,
    )
    expect(edited.toJSON()).toMatchObject({
      name: 'Trial class',
      description: 'First lesson',
      maxPerDay: 3,
      priceLabel: 'R$ 80',
      requiresApproval: true,
      updatedAt: LATER,
    })
    edited.archive(LATER)
    expect(edited.active).toBe(false)
    edited.moveTo(3, LATER)
    expect(edited.position).toBe(3)
    expect(() => edited.moveTo(-1, LATER)).toThrow(ValidationError)
    expect(BookingService.restore(edited.toJSON()).name).toBe('Trial class')
  })
})

describe('BookingClient', () => {
  function client(contact: { email?: string | null; phone?: string | null }) {
    return BookingClient.create({
      id: id(3),
      ownerId: OWNER,
      name: 'João',
      now: NOW,
      ...contact,
    })
  }

  it('normalizes contact details', () => {
    const created = client({
      email: ' Joao@Mail.com ',
      phone: '+55 (11) 98765-4321',
    })
    expect([created.email, created.phone]).toEqual([
      'joao@mail.com',
      '+5511987654321',
    ])
    expect([created.id, created.ownerId, created.name]).toEqual([
      id(3),
      OWNER,
      'João',
    ])
    expect(created.isOwnedBy(OWNER)).toBe(true)
  })

  it('needs an email or a valid phone', () => {
    expect(() => client({})).toThrow('email or a phone')
    expect(() => client({ phone: '123' })).toThrow('international')
    expect(() => client({ email: 'not-an-email' })).toThrow(ValidationError)
  })

  it('fills gaps on a repeat booking without erasing', () => {
    const repeat = client({ phone: '+5511987654321' })
    repeat.mergeContact({ name: 'João Pedro', email: 'jp@mail.com' }, LATER)
    expect(repeat.toJSON()).toMatchObject({
      name: 'João Pedro',
      email: 'jp@mail.com',
      phone: '+5511987654321',
      updatedAt: LATER,
    })
  })

  it('replaces contact details on update', () => {
    const edited = client({ email: 'a@mail.com' })
    edited.update(
      { name: 'Ana', phone: '+5511900000000', notes: ' VIP ' },
      LATER,
    )
    expect(edited.toJSON()).toMatchObject({
      email: null,
      phone: '+5511900000000',
      notes: 'VIP',
    })
    expect(BookingClient.restore(edited.toJSON()).name).toBe('Ana')
  })
})

describe('Booking', () => {
  const START = new Date('2026-06-22T13:00:00.000Z')
  const END = new Date('2026-06-22T13:50:00.000Z')

  function booking(requiresApproval = false, clientTimezone?: string | null) {
    return Booking.create({
      id: id(4),
      ownerId: OWNER,
      serviceId: id(2),
      clientId: id(3),
      startsAt: START,
      endsAt: END,
      requiresApproval,
      source: 'public',
      clientTimezone,
      note: ' See you ',
      now: NOW,
    })
  }

  it('starts confirmed, or pending when the service needs approval', () => {
    const confirmed = booking(false, 'Europe/Lisbon')
    expect(confirmed.status).toBe('confirmed')
    expect(confirmed.toJSON()).toMatchObject({
      clientTimezone: 'Europe/Lisbon',
      note: 'See you',
      calendarEventId: null,
    })
    expect(booking(true).status).toBe('pending')
    expect(booking(false, 'Mars/Base').toJSON().clientTimezone).toBeNull()
    expect(confirmed.holdsSlot).toBe(true)
    expect([
      confirmed.id,
      confirmed.ownerId,
      confirmed.serviceId,
      confirmed.clientId,
    ]).toEqual([id(4), OWNER, id(2), id(3)])
    expect([confirmed.startsAt, confirmed.endsAt]).toEqual([START, END])
    expect(confirmed.isOwnedBy(OTHER)).toBe(false)
  })

  it('rejects an empty or inverted window', () => {
    expect(() =>
      Booking.create({
        id: id(4),
        ownerId: OWNER,
        serviceId: id(2),
        clientId: id(3),
        startsAt: END,
        endsAt: START,
        requiresApproval: false,
        source: 'host',
        now: NOW,
      }),
    ).toThrow('end after')
  })

  it('confirms or declines a pending booking', () => {
    const approved = booking(true)
    approved.confirm(LATER)
    expect(approved.status).toBe('confirmed')
    const refused = booking(true)
    refused.decline(' Fully booked ', LATER)
    expect(refused.toJSON()).toMatchObject({
      status: 'declined',
      cancelReason: 'Fully booked',
    })
    expect(refused.holdsSlot).toBe(false)
    expect(() => refused.confirm(LATER)).toThrow('cannot become confirmed')
  })

  it('cancels, then refuses to reschedule', () => {
    const cancelled = booking()
    cancelled.cancel(null, LATER)
    expect(cancelled.toJSON().cancelReason).toBeNull()
    expect(() => cancelled.reschedule(START, END, LATER)).toThrow(
      'cancelled booking cannot be rescheduled',
    )
  })

  it('moves to a new time while it holds the slot', () => {
    const moved = booking()
    const nextStart = new Date('2026-06-23T13:00:00.000Z')
    const nextEnd = new Date('2026-06-23T13:50:00.000Z')
    moved.reschedule(nextStart, nextEnd, LATER)
    expect([moved.startsAt, moved.endsAt]).toEqual([nextStart, nextEnd])
    expect(() => moved.reschedule(nextEnd, nextStart, LATER)).toThrow(
      ValidationError,
    )
  })

  it('records an outcome only once the booking has started', () => {
    const held = booking()
    expect(() => held.markOutcome('completed', NOW)).toThrow('not started')
    held.markOutcome('no_show', END)
    expect(held.status).toBe('no_show')
    held.markOutcome('completed', END)
    expect(held.status).toBe('completed')
  })

  it('links its calendar event and restores as is', () => {
    const linked = booking()
    linked.linkCalendarEvent(id(9), LATER)
    expect(linked.calendarEventId).toBe(id(9))
    expect(Booking.restore(linked.toJSON()).toJSON()).toEqual(linked.toJSON())
  })
})
