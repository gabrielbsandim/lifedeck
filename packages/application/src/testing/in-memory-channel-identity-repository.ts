import type {
  ChannelIdentity,
  EntityId,
  MessageChannel,
} from '@lifedeck/domain'
import type { ChannelIdentityRepository } from '@/ports/channel-identity-repository'

export class InMemoryChannelIdentityRepository
  implements ChannelIdentityRepository
{
  private readonly items = new Map<string, ChannelIdentity>()

  async save(identity: ChannelIdentity): Promise<void> {
    this.items.set(identity.id as string, identity)
  }

  async findByUser(
    userId: EntityId,
    channel: MessageChannel,
  ): Promise<ChannelIdentity | null> {
    return (
      [...this.items.values()].find(
        item => item.userId === userId && item.channel === channel,
      ) ?? null
    )
  }

  async findByAddress(
    channel: MessageChannel,
    address: string,
  ): Promise<ChannelIdentity | null> {
    return (
      [...this.items.values()].find(
        item => item.channel === channel && item.address === address,
      ) ?? null
    )
  }

  async findPendingByCode(
    channel: MessageChannel,
    code: string,
  ): Promise<ChannelIdentity | null> {
    return (
      [...this.items.values()].find(
        item =>
          item.channel === channel &&
          !item.isVerified() &&
          item.pairingCode === code,
      ) ?? null
    )
  }
}
