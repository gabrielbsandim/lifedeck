import type {
  ChannelIdentity,
  EntityId,
  MessageChannel,
} from '@lifedeck/domain'

export interface ChannelIdentityRepository {
  save(identity: ChannelIdentity): Promise<void>
  findByUser(
    userId: EntityId,
    channel: MessageChannel,
  ): Promise<ChannelIdentity | null>
  findByAddress(
    channel: MessageChannel,
    address: string,
  ): Promise<ChannelIdentity | null>
  findPendingByCode(
    channel: MessageChannel,
    code: string,
  ): Promise<ChannelIdentity | null>
}
