import type { CalendarEvent, EntityId } from '@lifedeck/domain'
import type { CalendarEventRepository } from '@/ports/calendar-event-repository'

export class InMemoryCalendarEventRepository
  implements CalendarEventRepository
{
  private readonly items = new Map<string, CalendarEvent>()

  async save(event: CalendarEvent): Promise<void> {
    this.items.set(event.id as string, event)
  }

  async findById(id: EntityId): Promise<CalendarEvent | null> {
    return this.items.get(id as string) ?? null
  }

  async findByExternalId(
    ownerId: EntityId,
    externalId: string,
    connectionId?: EntityId,
  ): Promise<CalendarEvent | null> {
    return (
      [...this.items.values()].find(
        event =>
          event.isOwnedBy(ownerId) &&
          event.externalId === externalId &&
          (connectionId === undefined || event.connectionId === connectionId),
      ) ?? null
    )
  }

  async listByOwnerInRange(
    ownerId: EntityId,
    from: Date,
    to: Date,
  ): Promise<CalendarEvent[]> {
    return [...this.items.values()]
      .filter(
        event =>
          event.isOwnedBy(ownerId) &&
          event.recurrence === null &&
          event.recurrenceMasterExternalId === null &&
          event.startsAt.getTime() <= to.getTime() &&
          event.endsAt.getTime() >= from.getTime(),
      )
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
  }

  async listRecurringMasters(ownerId: EntityId): Promise<CalendarEvent[]> {
    return [...this.items.values()]
      .filter(event => event.isOwnedBy(ownerId) && event.recurrence !== null)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
  }

  async listOverridesByMasterExternalIds(
    ownerId: EntityId,
    masterExternalIds: string[],
  ): Promise<CalendarEvent[]> {
    const wanted = new Set(masterExternalIds)
    return [...this.items.values()]
      .filter(
        event =>
          event.isOwnedBy(ownerId) &&
          event.recurrenceMasterExternalId !== null &&
          wanted.has(event.recurrenceMasterExternalId),
      )
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
  }

  async findOverrideByOriginalStart(
    ownerId: EntityId,
    masterExternalId: string,
    originalStartsAt: Date,
  ): Promise<CalendarEvent | null> {
    return (
      [...this.items.values()].find(
        event =>
          event.isOwnedBy(ownerId) &&
          event.recurrenceMasterExternalId === masterExternalId &&
          event.originalStartsAt?.getTime() === originalStartsAt.getTime(),
      ) ?? null
    )
  }

  async listByOwner(ownerId: EntityId): Promise<CalendarEvent[]> {
    return [...this.items.values()]
      .filter(event => event.isOwnedBy(ownerId))
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
  }

  async delete(id: EntityId): Promise<void> {
    this.items.delete(id as string)
  }

  async deleteOverridesByMasterExternalId(
    ownerId: EntityId,
    masterExternalId: string,
  ): Promise<void> {
    for (const [id, event] of this.items) {
      if (
        event.isOwnedBy(ownerId) &&
        event.recurrenceMasterExternalId === masterExternalId
      ) {
        this.items.delete(id)
      }
    }
  }

  async deleteByConnection(
    ownerId: EntityId,
    connectionId: EntityId,
  ): Promise<void> {
    for (const [id, event] of this.items) {
      if (event.isOwnedBy(ownerId) && event.connectionId === connectionId) {
        this.items.delete(id)
      }
    }
  }
}
