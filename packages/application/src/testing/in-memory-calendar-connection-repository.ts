import type { CalendarConnection, EntityId } from '@lifedeck/domain'
import type { CalendarConnectionRepository } from '@/ports/calendar-connection-repository'

export class InMemoryCalendarConnectionRepository
  implements CalendarConnectionRepository
{
  private readonly items = new Map<string, CalendarConnection>()

  async save(connection: CalendarConnection): Promise<void> {
    this.items.set(connection.id as string, connection)
  }

  async findById(id: EntityId): Promise<CalendarConnection | null> {
    return this.items.get(id as string) ?? null
  }

  async findByChannelId(channelId: string): Promise<CalendarConnection | null> {
    return (
      [...this.items.values()].find(
        item => item.toJSON().channelId === channelId,
      ) ?? null
    )
  }

  async findDefaultByOwner(
    ownerId: EntityId,
  ): Promise<CalendarConnection | null> {
    const owned = [...this.items.values()].filter(item =>
      item.isOwnedBy(ownerId),
    )
    return (
      owned.find(item => item.isDefault) ??
      owned.sort(
        (a, b) =>
          a.toJSON().createdAt.getTime() - b.toJSON().createdAt.getTime(),
      )[0] ??
      null
    )
  }

  async listByOwner(ownerId: EntityId): Promise<CalendarConnection[]> {
    return [...this.items.values()]
      .filter(item => item.isOwnedBy(ownerId))
      .sort(
        (a, b) =>
          a.toJSON().createdAt.getTime() - b.toJSON().createdAt.getTime(),
      )
  }

  async listAll(): Promise<CalendarConnection[]> {
    return [...this.items.values()]
  }

  async delete(id: EntityId): Promise<void> {
    this.items.delete(id as string)
  }
}
