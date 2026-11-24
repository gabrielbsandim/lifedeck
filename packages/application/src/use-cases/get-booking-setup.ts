import { asEntityId, civilDate } from '@lifedeck/domain'
import type { BookingSetupView } from '@/dtos/booking-dto'
import {
  toBookingPageView,
  toBookingServiceView,
} from '@/mappers/booking-mapper'
import type { AvailabilityRepository } from '@/ports/availability-repository'
import type { BookingPageRepository } from '@/ports/booking-page-repository'
import type { BookingServiceRepository } from '@/ports/booking-service-repository'
import type { Clock } from '@/ports/clock'

const OVERRIDE_WINDOW_MS = 400 * 24 * 60 * 60_000

type Dependencies = {
  pages: Pick<BookingPageRepository, 'findByOwner'>
  services: Pick<BookingServiceRepository, 'listByPage'>
  availability: Pick<AvailabilityRepository, 'getWeekly' | 'listOverrides'>
  clock: Clock
}

export function makeGetBookingSetup({
  pages,
  services,
  availability,
  clock,
}: Dependencies) {
  return async function getBookingSetup(
    ownerId: string,
  ): Promise<BookingSetupView> {
    const page = await pages.findByOwner(asEntityId(ownerId))
    if (!page) {
      return { page: null, services: [], weekly: [], overrides: [] }
    }
    const now = clock.now()
    const [all, weekly, overrides] = await Promise.all([
      services.listByPage(page.id),
      availability.getWeekly(page.id),
      availability.listOverrides(
        page.id,
        civilDate(now, page.timezone),
        civilDate(new Date(now.getTime() + OVERRIDE_WINDOW_MS), page.timezone),
      ),
    ])
    return {
      page: toBookingPageView(page),
      services: all.map(toBookingServiceView),
      weekly,
      overrides,
    }
  }
}
