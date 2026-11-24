import { ValidationError } from '@/shared/domain-error'

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/

// Path segments the app or the booking routes already use under `/b/`, plus
// names a visitor could mistake for the product itself.
const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'app',
  'b',
  'book',
  'booking',
  'bookings',
  'help',
  'lifedeck',
  'login',
  'manage',
  'new',
  'settings',
  'support',
  'www',
])

export function isReservedBookingSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug)
}

/** Lowercase, 3 to 40 of `a-z 0-9 -`, no leading, trailing or doubled hyphen. */
export function validateBookingSlug(raw: string): string {
  const slug = raw.trim().toLowerCase()
  if (!SLUG_PATTERN.test(slug) || slug.includes('--')) {
    throw new ValidationError(
      'Booking link must be 3 to 40 letters, digits or single hyphens.',
    )
  }
  if (isReservedBookingSlug(slug)) {
    throw new ValidationError('That booking link is reserved.')
  }
  return slug
}
