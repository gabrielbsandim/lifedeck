import { validateWeeklyAvailability, type WeeklyWindow } from '@lifedeck/domain'
import {
  setAvailabilitySchema,
  type SetAvailabilityInput,
} from '@/dtos/booking-dto'
import type { AvailabilityRepository } from '@/ports/availability-repository'
import type { BookingPageRepository } from '@/ports/booking-page-repository'
import type { UnitOfWork } from '@/ports/unit-of-work'
import { requireOwnPage } from '@/shared/booking-context'

type Dependencies = {
  pages: Pick<BookingPageRepository, 'findByOwner'>
  availability: Pick<AvailabilityRepository, 'replaceWeekly'>
  unitOfWork: UnitOfWork
}

export function makeSetAvailability({
  pages,
  availability,
  unitOfWork,
}: Dependencies) {
  return async function setAvailability(
    ownerId: string,
    input: SetAvailabilityInput,
  ): Promise<WeeklyWindow[]> {
    const { weekly } = setAvailabilitySchema.parse(input)
    const windows = validateWeeklyAvailability(weekly)
    const page = await requireOwnPage(pages, ownerId)
    await unitOfWork.run(() => availability.replaceWeekly(page.id, windows))
    return windows
  }
}
