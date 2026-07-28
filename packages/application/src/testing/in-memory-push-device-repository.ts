import type { EntityId, PushDevice } from '@lifedeck/domain'
import type { PushDeviceRepository } from '@/ports/push-device-repository'

export class InMemoryPushDeviceRepository implements PushDeviceRepository {
  private readonly items = new Map<string, PushDevice>()

  async save(device: PushDevice): Promise<void> {
    // Keyed on the token, like the table: the token is what identifies an
    // installation, and re-registering must replace rather than duplicate.
    this.items.set(device.token, device)
  }

  async findByToken(token: string): Promise<PushDevice | null> {
    return this.items.get(token) ?? null
  }

  async listByUser(userId: EntityId): Promise<PushDevice[]> {
    return [...this.items.values()].filter(item => item.userId === userId)
  }

  async deleteByTokens(tokens: string[]): Promise<void> {
    for (const token of tokens) {
      this.items.delete(token)
    }
  }
}
