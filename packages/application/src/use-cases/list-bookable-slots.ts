import {
  listBookableSlotsQuerySchema,
  type BookableSlotView,
  type ListBookableSlotsQuery,
} from '@/dtos/booking-dto'
import type { PublicPageLoader } from '@/shared/booking-context'
import type { ServiceSlots } from '@/shared/booking-slots'

// One month view at a time keeps a public, unauthenticated read cheap.
const MAX_RANGE_MS = 31 * 24 * 60 * 60_000

type Dependencies = {
  loader: PublicPageLoader
  serviceSlots: ServiceSlots
}

export function makeListBookableSlots({ loader, serviceSlots }: Dependencies) {
  return async function listBookableSlots(
    slug: string,
    query: ListBookableSlotsQuery,
  ): Promise<BookableSlotView[]> {
    const data = listBookableSlotsQuerySchema.parse(query)
    const page = await loader.page(slug)
    const service = await loader.service(page, data.serviceId)
    const from = new Date(data.from)
    const to = new Date(
      Math.min(Date.parse(data.to), from.getTime() + MAX_RANGE_MS),
    )
    if (to <= from) {
      return []
    }
    const slots = await serviceSlots(page, service, from, to)
    return slots.map(slot => ({
      startsAt: slot.start.toISOString(),
      endsAt: slot.end.toISOString(),
    }))
  }
}
