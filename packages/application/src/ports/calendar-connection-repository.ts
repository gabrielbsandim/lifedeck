import type { CalendarConnection, EntityId } from '@lifedeck/domain'

export interface CalendarConnectionRepository {
  save(connection: CalendarConnection): Promise<void>
  findById(id: EntityId): Promise<CalendarConnection | null>
  findByChannelId(channelId: string): Promise<CalendarConnection | null>
  findDefaultByOwner(ownerId: EntityId): Promise<CalendarConnection | null>
  listByOwner(ownerId: EntityId): Promise<CalendarConnection[]>
  listAll(): Promise<CalendarConnection[]>
  delete(id: EntityId): Promise<void>
}
