import type { BookingClient, EntityId } from '@lifedeck/domain'

export interface BookingClientRepository {
  save(client: BookingClient): Promise<void>
  findById(id: EntityId): Promise<BookingClient | null>
  findByPhone(ownerId: EntityId, phone: string): Promise<BookingClient | null>
  findByEmail(ownerId: EntityId, email: string): Promise<BookingClient | null>
  listByOwner(ownerId: EntityId): Promise<BookingClient[]>
}
