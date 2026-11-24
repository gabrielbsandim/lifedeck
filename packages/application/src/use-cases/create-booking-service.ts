import { BookingService } from '@lifedeck/domain'
import {
  bookingServiceInputSchema,
  type BookingServiceInput,
  type BookingServiceView,
} from '@/dtos/booking-dto'
import { toBookingServiceView } from '@/mappers/booking-mapper'
import type { BookingPageRepository } from '@/ports/booking-page-repository'
import type { BookingServiceRepository } from '@/ports/booking-service-repository'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import { requireOwnPage } from '@/shared/booking-context'

type Dependencies = {
  pages: Pick<BookingPageRepository, 'findByOwner'>
  services: BookingServiceRepository
  ids: IdGenerator
  clock: Clock
}

export function makeCreateBookingService({
  pages,
  services,
  ids,
  clock,
}: Dependencies) {
  return async function createBookingService(
    ownerId: string,
    input: BookingServiceInput,
  ): Promise<BookingServiceView> {
    const settings = bookingServiceInputSchema.parse(input)
    const page = await requireOwnPage(pages, ownerId)
    const existing = await services.listByPage(page.id)
    const service = BookingService.create({
      ...settings,
      id: ids.generate(),
      ownerId: page.ownerId,
      pageId: page.id,
      position: existing.length,
      now: clock.now(),
    })
    await services.save(service)
    return toBookingServiceView(service)
  }
}
