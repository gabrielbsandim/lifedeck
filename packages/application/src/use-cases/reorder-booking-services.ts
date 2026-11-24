import { ValidationError } from '@lifedeck/domain'
import {
  reorderBookingServicesSchema,
  type BookingServiceView,
} from '@/dtos/booking-dto'
import { toBookingServiceView } from '@/mappers/booking-mapper'
import type { BookingPageRepository } from '@/ports/booking-page-repository'
import type { BookingServiceRepository } from '@/ports/booking-service-repository'
import type { Clock } from '@/ports/clock'
import type { UnitOfWork } from '@/ports/unit-of-work'
import { requireOwnPage } from '@/shared/booking-context'

type Dependencies = {
  pages: Pick<BookingPageRepository, 'findByOwner'>
  services: BookingServiceRepository
  unitOfWork: UnitOfWork
  clock: Clock
}

export function makeReorderBookingServices({
  pages,
  services,
  unitOfWork,
  clock,
}: Dependencies) {
  return async function reorderBookingServices(
    ownerId: string,
    input: { ids: string[] },
  ): Promise<BookingServiceView[]> {
    const { ids } = reorderBookingServicesSchema.parse(input)
    const page = await requireOwnPage(pages, ownerId)
    const current = await services.listByPage(page.id)
    const known = new Set(current.map(service => service.id as string))
    const sent = new Set(ids)
    const complete = sent.size === ids.length && sent.size === known.size
    if (!complete || !ids.every(id => known.has(id))) {
      throw new ValidationError('Send every service exactly once.')
    }
    const ordered = ids.flatMap(id =>
      current.filter(service => service.id === id),
    )
    await unitOfWork.run(async () => {
      for (const [position, service] of ordered.entries()) {
        service.moveTo(position, clock.now())
        await services.save(service)
      }
    })
    return ordered.map(toBookingServiceView)
  }
}
