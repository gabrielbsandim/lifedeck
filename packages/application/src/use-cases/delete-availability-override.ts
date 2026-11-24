import { ValidationError } from '@lifedeck/domain'
import type { AvailabilityRepository } from '@/ports/availability-repository'
import type { BookingPageRepository } from '@/ports/booking-page-repository'
import { requireOwnPage } from '@/shared/booking-context'

type Dependencies = {
  pages: Pick<BookingPageRepository, 'findByOwner'>
  availability: Pick<AvailabilityRepository, 'deleteOverride'>
}

export function makeDeleteAvailabilityOverride({
  pages,
  availability,
}: Dependencies) {
  return async function deleteAvailabilityOverride(
    ownerId: string,
    date: string,
  ): Promise<void> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new ValidationError('Date must be YYYY-MM-DD.')
    }
    const page = await requireOwnPage(pages, ownerId)
    await availability.deleteOverride(page.id, date)
  }
}
