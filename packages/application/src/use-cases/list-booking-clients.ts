import { asEntityId } from '@lifedeck/domain'
import type { BookingClientView } from '@/dtos/booking-dto'
import { toBookingClientView } from '@/mappers/booking-mapper'
import type { BookingClientRepository } from '@/ports/booking-client-repository'

type Dependencies = {
  clients: Pick<BookingClientRepository, 'listByOwner'>
}

export function makeListBookingClients({ clients }: Dependencies) {
  return async function listBookingClients(
    ownerId: string,
    query: { search?: string } = {},
  ): Promise<BookingClientView[]> {
    const all = await clients.listByOwner(asEntityId(ownerId))
    const needle = query.search?.trim().toLowerCase() ?? ''
    const digits = needle.replace(/\D/g, '')
    const matches = all.filter(
      client =>
        needle.length === 0 ||
        client.name.toLowerCase().includes(needle) ||
        (client.email ?? '').includes(needle) ||
        (digits.length >= 4 && (client.phone ?? '').includes(digits)),
    )
    return matches.map(toBookingClientView)
  }
}
