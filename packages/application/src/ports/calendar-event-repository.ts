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
  listRecurringMasters(ownerId: EntityId): Promise<CalendarEvent[]>
  listOverridesByMasterExternalIds(
    ownerId: EntityId,
    masterExternalIds: string[],
  ): Promise<CalendarEvent[]>
  findOverrideByOriginalStart(
    ownerId: EntityId,
    masterExternalId: string,
    originalStartsAt: Date,
  ): Promise<CalendarEvent | null>
  listByOwner(ownerId: EntityId): Promise<CalendarEvent[]>
  delete(id: EntityId): Promise<void>
  deleteOverridesByMasterExternalId(
    ownerId: EntityId,
    masterExternalId: string,
  ): Promise<void>
  deleteByConnection(ownerId: EntityId, connectionId: EntityId): Promise<void>
}
