import {
  validateAvailabilityOverride,
  type AvailabilityOverride,
} from '@lifedeck/domain'
import {
  availabilityOverrideInputSchema,
  type AvailabilityOverrideInput,
} from '@/dtos/booking-dto'
import type { AvailabilityRepository } from '@/ports/availability-repository'
import type { BookingPageRepository } from '@/ports/booking-page-repository'
import { requireOwnPage } from '@/shared/booking-context'

type Dependencies = {
  pages: Pick<BookingPageRepository, 'findByOwner'>
  availability: Pick<AvailabilityRepository, 'saveOverride'>
}

/** An empty `windows` closes the day; otherwise they replace its hours. */
export function makeSetAvailabilityOverride({
  pages,
  availability,
}: Dependencies) {
  return async function setAvailabilityOverride(
    ownerId: string,
    input: AvailabilityOverrideInput,
  ): Promise<AvailabilityOverride> {
    const override = validateAvailabilityOverride(
      availabilityOverrideInputSchema.parse(input),
    )
    const page = await requireOwnPage(pages, ownerId)
    await availability.saveOverride(page.id, override)
    return override
  }
}
