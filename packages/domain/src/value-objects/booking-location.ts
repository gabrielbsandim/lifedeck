import { ValidationError } from '@/shared/domain-error'
import { guard } from '@/shared/guard'

export const BOOKING_LOCATION_KINDS = [
  'online-meet',
  'online-link',
  'in-person',
  'phone',
] as const

export type BookingLocationKind = (typeof BOOKING_LOCATION_KINDS)[number]

export type BookingLocation =
  | { kind: 'online-meet' }
  | { kind: 'online-link'; url: string }
  | { kind: 'in-person'; address: string }
  | { kind: 'phone' }

const MAX_URL_LENGTH = 500
const MAX_ADDRESS_LENGTH = 300

function validateUrl(raw: string): string {
  const url = guard.maxLength(
    guard.notEmpty(raw, 'Meeting link'),
    MAX_URL_LENGTH,
    'Meeting link',
  )
  if (!/^https?:\/\/[^\s]+$/i.test(url)) {
    throw new ValidationError('Meeting link must be an http(s) URL.')
  }
  return url
}

export function validateBookingLocation(input: {
  kind: string
  url?: string | null
  address?: string | null
}): BookingLocation {
  const kind = guard.oneOf(input.kind, BOOKING_LOCATION_KINDS, 'Location')
  switch (kind) {
    case 'online-link':
      return { kind, url: validateUrl(input.url ?? '') }
    case 'in-person':
      return {
        kind,
        address: guard.maxLength(
          guard.notEmpty(input.address ?? '', 'Address'),
          MAX_ADDRESS_LENGTH,
          'Address',
        ),
      }
    case 'online-meet':
    case 'phone':
      return { kind }
  }
}
