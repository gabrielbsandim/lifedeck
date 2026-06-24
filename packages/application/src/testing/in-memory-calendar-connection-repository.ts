import type { CalendarConnection, EntityId } from '@lifedeck/domain'
import type { CalendarConnectionRepository } from '@/ports/calendar-connection-repository'

export class InMemoryCalendarConnectionRepository
  implements CalendarConnectionRepository
{
  private readonly items = new Map<string, CalendarConnection>()

  async save(connection: CalendarConnection): Promise<void> {
    this.items.set(connection.id as string, connection)
  }

  async findByOwner(ownerId: EntityId): Promise<CalendarConnection | null> {
    return (
      [...this.items.values()].find(item => item.isOwnedBy(ownerId)) ?? null
    )
  }

  async findByChannelId(channelId: string): Promise<CalendarConnection | null> {
    return (
      [...this.items.values()].find(
        item => item.toJSON().channelId === channelId,
      ) ?? null
    )
  }
}
