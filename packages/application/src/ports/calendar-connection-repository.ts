import type { CalendarConnection, EntityId } from '@lifedeck/domain'

export interface CalendarConnectionRepository {
  save(connection: CalendarConnection): Promise<void>
  findByOwner(ownerId: EntityId): Promise<CalendarConnection | null>
  findByChannelId(channelId: string): Promise<CalendarConnection | null>
  listAll(): Promise<CalendarConnection[]>
}
