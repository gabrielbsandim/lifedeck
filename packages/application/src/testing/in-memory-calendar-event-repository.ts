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
  ): Promise<CalendarEvent | null> {
    return (
      [...this.items.values()].find(
        event => event.isOwnedBy(ownerId) && event.externalId === externalId,
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
          event.startsAt.getTime() <= to.getTime() &&
          event.endsAt.getTime() >= from.getTime(),
      )
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
  }

  async listByOwner(ownerId: EntityId): Promise<CalendarEvent[]> {
    return [...this.items.values()]
      .filter(event => event.isOwnedBy(ownerId))
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
  }

  async delete(id: EntityId): Promise<void> {
    this.items.delete(id as string)
  }
}
