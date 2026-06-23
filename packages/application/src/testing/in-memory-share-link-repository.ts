import type { EntityId, ShareLink } from '@lifedeck/domain'
import type { ShareLinkRepository } from '@/ports/share-link-repository'

export class InMemoryShareLinkRepository implements ShareLinkRepository {
  private readonly store = new Map<string, ShareLink>()

  async save(link: ShareLink): Promise<void> {
    this.store.set(link.id, link)
  }

  async findById(id: EntityId): Promise<ShareLink | null> {
    return this.store.get(id) ?? null
  }

  async findByToken(token: string): Promise<ShareLink | null> {
    return [...this.store.values()].find(link => link.token === token) ?? null
  }

  async listByList(listId: EntityId): Promise<ShareLink[]> {
    return [...this.store.values()].filter(link => link.listId === listId)
  }

  async delete(id: EntityId): Promise<void> {
    this.store.delete(id)
  }
}
