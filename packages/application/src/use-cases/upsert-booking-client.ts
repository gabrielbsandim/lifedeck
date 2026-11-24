import { asEntityId } from '@lifedeck/domain'
import {
  bookingClientInputSchema,
  type BookingClientInput,
  type BookingClientView,
} from '@/dtos/booking-dto'
import { NotFoundError } from '@/errors/use-case-error'
import { toBookingClientView } from '@/mappers/booking-mapper'
import type { BookingClientRepository } from '@/ports/booking-client-repository'
import type { Clock } from '@/ports/clock'
import type { UpsertBookingClient } from '@/shared/booking-records'

type Dependencies = {
  clients: BookingClientRepository
  upsertBookingClient: UpsertBookingClient
  clock: Clock
}

/** With an id it edits that client; without one it reuses a match by phone or email. */
export function makeUpsertBookingClientForHost({
  clients,
  upsertBookingClient,
  clock,
}: Dependencies) {
  return async function upsertClient(
    ownerId: string,
    input: BookingClientInput,
    clientId?: string,
  ): Promise<BookingClientView> {
    const contact = bookingClientInputSchema.parse(input)
    const owner = asEntityId(ownerId)
    if (clientId === undefined) {
      return toBookingClientView(await upsertBookingClient(owner, contact))
    }
    const client = await clients.findById(asEntityId(clientId))
    if (!client || !client.isOwnedBy(owner)) {
      throw new NotFoundError('Client')
    }
    client.update(contact, clock.now())
    await clients.save(client)
    return toBookingClientView(client)
  }
}
