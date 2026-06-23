import type { EntityId, ShareLink } from '@lifedeck/domain'

export interface ShareLinkRepository {
  save(link: ShareLink): Promise<void>
  findById(id: EntityId): Promise<ShareLink | null>
  findByToken(token: string): Promise<ShareLink | null>
  listByList(listId: EntityId): Promise<ShareLink[]>
  delete(id: EntityId): Promise<void>
}
