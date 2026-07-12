import type { CalendarEvent, EntityId } from '@lifedeck/domain'

export interface CalendarEventRepository {
  save(event: CalendarEvent): Promise<void>
  findById(id: EntityId): Promise<CalendarEvent | null>
  findByExternalId(
    ownerId: EntityId,
    externalId: string,
    connectionId?: EntityId,
  ): Promise<CalendarEvent | null>
  listByOwnerInRange(
    ownerId: EntityId,
    from: Date,
    to: Date,
  ): Promise<CalendarEvent[]>
  listByOwner(ownerId: EntityId): Promise<CalendarEvent[]>
  delete(id: EntityId): Promise<void>
  deleteByConnection(ownerId: EntityId, connectionId: EntityId): Promise<void>
}
