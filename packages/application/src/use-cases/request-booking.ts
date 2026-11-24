import {
  requestBookingSchema,
  type BookingRequestResult,
  type RequestBookingInput,
} from '@/dtos/booking-dto'
import { SlotTakenError } from '@/errors/use-case-error'
import type { BookingTokenSigner } from '@/ports/booking-token-signer'
import type { UnitOfWork } from '@/ports/unit-of-work'
import type { PublicPageLoader } from '@/shared/booking-context'
import type {
  BookingLifecycle,
  UpsertBookingClient,
} from '@/shared/booking-records'
import {
  isSlotOpen,
  type RefreshHostCalendar,
  type ServiceSlots,
} from '@/shared/booking-slots'

type Dependencies = {
  loader: PublicPageLoader
  serviceSlots: ServiceSlots
  refreshHostCalendar: RefreshHostCalendar
  upsertBookingClient: UpsertBookingClient
  lifecycle: Pick<BookingLifecycle, 'open'>
  tokens: BookingTokenSigner
  unitOfWork: UnitOfWork
}

export function makeRequestBooking({
  loader,
  serviceSlots,
  refreshHostCalendar,
  upsertBookingClient,
  lifecycle,
  tokens,
  unitOfWork,
}: Dependencies) {
  return async function requestBooking(
    slug: string,
    input: RequestBookingInput,
  ): Promise<BookingRequestResult> {
    const data = requestBookingSchema.parse(input)
    const page = await loader.page(slug)
    const service = await loader.service(page, data.serviceId)
    const startsAt = new Date(data.startsAt)

    const fresh = await refreshHostCalendar(page.ownerId as string)
    if (!(await isSlotOpen(serviceSlots, page, service, startsAt))) {
      throw new SlotTakenError()
    }

    const booking = await unitOfWork.run(async () => {
      const client = await upsertBookingClient(page.ownerId, {
        name: data.name,
        email: data.email,
        phone: data.phone,
      })
      return lifecycle.open({
        page,
        service,
        client,
        startsAt,
        source: 'public',
        requiresApproval: service.requiresApproval,
        clientTimezone: data.timezone,
        note: data.note,
        byClient: true,
        calendarStale: !fresh,
      })
    })
    return {
      bookingId: booking.id as string,
      status: booking.status,
      startsAt: booking.startsAt.toISOString(),
      endsAt: booking.endsAt.toISOString(),
      manageToken: tokens.sign(booking.id as string),
    }
  }
}
