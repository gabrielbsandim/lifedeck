import type { EntityId, PushDevice } from '@lifedeck/domain'

export interface PushDeviceRepository {
  save(device: PushDevice): Promise<void>
  findByToken(token: string): Promise<PushDevice | null>
  listByUser(userId: EntityId): Promise<PushDevice[]>
  // Used both when a user signs out and when the push provider reports a token
  // as gone, so it takes tokens rather than ids.
  deleteByTokens(tokens: string[]): Promise<void>
}
