import {
  asEntityId,
  isReservedBookingSlug,
  validateBookingSlug,
} from '@lifedeck/domain'
import type { SlugAvailabilityView } from '@/dtos/booking-dto'
import type { BookingPageRepository } from '@/ports/booking-page-repository'

type Dependencies = {
  pages: Pick<BookingPageRepository, 'findBySlug'>
}

export function makeCheckBookingSlug({ pages }: Dependencies) {
  return async function checkBookingSlug(
    ownerId: string,
    raw: string,
  ): Promise<SlugAvailabilityView> {
    const candidate = raw.trim().toLowerCase()
    if (isReservedBookingSlug(candidate)) {
      return { slug: candidate, available: false, reason: 'reserved' }
    }
    let slug: string
    try {
      slug = validateBookingSlug(candidate)
    } catch {
      // The validator is pure: any throw means the slug is malformed.
      return { slug: candidate, available: false, reason: 'invalid' }
    }
    const holder = await pages.findBySlug(slug)
    if (holder && holder.ownerId !== asEntityId(ownerId)) {
      return { slug, available: false, reason: 'taken' }
    }
    return { slug, available: true, reason: null }
  }
}
