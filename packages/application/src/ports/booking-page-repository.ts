import type { BookingPage, EntityId } from '@lifedeck/domain'

export interface BookingPageRepository {
  save(page: BookingPage): Promise<void>
  findById(id: EntityId): Promise<BookingPage | null>
  findByOwner(ownerId: EntityId): Promise<BookingPage | null>
  findBySlug(slug: string): Promise<BookingPage | null>
}
