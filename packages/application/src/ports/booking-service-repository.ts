import type { BookingService, EntityId } from '@lifedeck/domain'

export interface BookingServiceRepository {
  save(service: BookingService): Promise<void>
  findById(id: EntityId): Promise<BookingService | null>
  /** Archived services included, ordered by position. */
  listByPage(pageId: EntityId): Promise<BookingService[]>
}
