import { describe, expect, it } from 'vitest'
import { ValidationError } from '@/shared/domain-error'
import {
  validateAvailabilityOverride,
  validateWeeklyAvailability,
} from '@/value-objects/availability'
import { validateBookingLocation } from '@/value-objects/booking-location'
import {
  isReservedBookingSlug,
  validateBookingSlug,
} from '@/value-objects/booking-slug'
import {
  canTransitionBooking,
  holdsSlot,
  isBookingSource,
  isBookingStatus,
} from '@/value-objects/booking-status'

describe('validateBookingSlug', () => {
  it('normalizes a valid slug', () => {
    expect(validateBookingSlug('  Ana-Silva2 ')).toBe('ana-silva2')
  })

  it.each(['ab', '-ana', 'ana-', 'an--a', 'ana_silva', 'x'.repeat(41)])(
    'rejects %s',
    slug => {
      expect(() => validateBookingSlug(slug)).toThrow(ValidationError)
    },
  )

  it('rejects reserved words', () => {
    expect(isReservedBookingSlug('manage')).toBe(true)
    expect(isReservedBookingSlug('ana')).toBe(false)
    expect(() => validateBookingSlug('Manage')).toThrow('reserved')
  })
})

describe('validateBookingLocation', () => {
  it('accepts every kind with the details it needs', () => {
    expect(validateBookingLocation({ kind: 'online-meet' })).toEqual({
      kind: 'online-meet',
    })
    expect(validateBookingLocation({ kind: 'phone', url: 'ignored' })).toEqual({
      kind: 'phone',
    })
    expect(
      validateBookingLocation({
        kind: 'online-link',
        url: ' https://zoom.us/j/1 ',
      }),
    ).toEqual({ kind: 'online-link', url: 'https://zoom.us/j/1' })
    expect(
      validateBookingLocation({ kind: 'in-person', address: ' Rua A, 1 ' }),
    ).toEqual({ kind: 'in-person', address: 'Rua A, 1' })
  })

  it('rejects a missing or unsafe link, a missing address, an unknown kind', () => {
    expect(() => validateBookingLocation({ kind: 'online-link' })).toThrow(
      ValidationError,
    )
    expect(() =>
      validateBookingLocation({ kind: 'online-link', url: 'javascript:x' }),
    ).toThrow('http(s)')
    expect(() =>
      validateBookingLocation({ kind: 'in-person', address: null }),
    ).toThrow(ValidationError)
    expect(() => validateBookingLocation({ kind: 'teleport' })).toThrow(
      ValidationError,
    )
  })
})

describe('booking status', () => {
  it('follows the transition graph', () => {
    expect(canTransitionBooking('pending', 'confirmed')).toBe(true)
    expect(canTransitionBooking('confirmed', 'no_show')).toBe(true)
    expect(canTransitionBooking('no_show', 'completed')).toBe(true)
    expect(canTransitionBooking('cancelled', 'confirmed')).toBe(false)
    expect(canTransitionBooking('pending', 'completed')).toBe(false)
  })

  it('holds the slot only while pending or confirmed', () => {
    expect(holdsSlot('pending')).toBe(true)
    expect(holdsSlot('confirmed')).toBe(true)
    expect(holdsSlot('declined')).toBe(false)
  })

  it('recognizes statuses and sources', () => {
    expect(isBookingStatus('no_show')).toBe(true)
    expect(isBookingStatus('lost')).toBe(false)
    expect(isBookingSource('assistant')).toBe(true)
    expect(isBookingSource('email')).toBe(false)
  })
})

describe('validateWeeklyAvailability', () => {
  it('sorts by weekday and start', () => {
    expect(
      validateWeeklyAvailability([
        { weekday: 2, startMinute: 600, endMinute: 660 },
        { weekday: 1, startMinute: 840, endMinute: 900 },
        { weekday: 1, startMinute: 540, endMinute: 600 },
      ]),
    ).toEqual([
      { weekday: 1, startMinute: 540, endMinute: 600 },
      { weekday: 1, startMinute: 840, endMinute: 900 },
      { weekday: 2, startMinute: 600, endMinute: 660 },
    ])
  })

  it.each([
    [{ weekday: 7, startMinute: 0, endMinute: 60 }],
    [{ weekday: 1.5, startMinute: 0, endMinute: 60 }],
    [{ weekday: 1, startMinute: 60, endMinute: 60 }],
    [{ weekday: 1, startMinute: -1, endMinute: 60 }],
    [{ weekday: 1, startMinute: 0, endMinute: 1441 }],
  ])('rejects %o', window => {
    expect(() => validateWeeklyAvailability([window])).toThrow(ValidationError)
  })

  it('rejects overlapping windows and too many in a day', () => {
    expect(() =>
      validateWeeklyAvailability([
        { weekday: 1, startMinute: 540, endMinute: 600 },
        { weekday: 1, startMinute: 570, endMinute: 630 },
      ]),
    ).toThrow('overlap')
    const many = Array.from({ length: 9 }, (_, i) => ({
      weekday: 1,
      startMinute: i * 60,
      endMinute: i * 60 + 30,
    }))
    expect(() => validateWeeklyAvailability(many)).toThrow('at most 8')
  })
})

describe('validateAvailabilityOverride', () => {
  it('accepts a closed day and custom hours', () => {
    expect(
      validateAvailabilityOverride({ date: '2026-12-25', windows: [] }),
    ).toEqual({ date: '2026-12-25', windows: [] })
    expect(
      validateAvailabilityOverride({
        date: '2026-12-24',
        windows: [{ startMinute: 480, endMinute: 720 }],
      }).windows,
    ).toEqual([{ startMinute: 480, endMinute: 720 }])
  })

  it('rejects a malformed date', () => {
    expect(() =>
      validateAvailabilityOverride({ date: '24/12/2026', windows: [] }),
    ).toThrow('YYYY-MM-DD')
  })
})
