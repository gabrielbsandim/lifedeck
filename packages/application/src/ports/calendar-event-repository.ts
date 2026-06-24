import type { CalendarEvent, EntityId } from '@lifedeck/domain'

export interface CalendarEventRepository {
  save(event: CalendarEvent): Promise<void>
  findById(id: EntityId): Promise<CalendarEvent | null>
  findByExternalId(
    ownerId: EntityId,
    externalId: string,
  ): Promise<CalendarEvent | null>
  listByOwnerInRange(
    ownerId: EntityId,
    from: Date,
    to: Date,
  ): Promise<CalendarEvent[]>
  delete(id: EntityId): Promise<void>
}
