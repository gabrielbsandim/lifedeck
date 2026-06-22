import { asEntityId } from '@taskin/domain'
import { NotFoundError } from '@/errors/use-case-error'
import type { ListRepository } from '@/ports/list-repository'
import type { ShareLinkRepository } from '@/ports/share-link-repository'

type Dependencies = {
  shareLinks: ShareLinkRepository
  lists: ListRepository
}

export function makeRevokeShareLink({ shareLinks, lists }: Dependencies) {
  return async function revokeShareLink(
    requesterId: string,
    linkId: string,
  ): Promise<void> {
    const link = await shareLinks.findById(asEntityId(linkId))
    if (!link) {
      throw new NotFoundError('Share link')
    }

    const list = await lists.findById(link.listId)
    if (!list || !list.isOwnedBy(asEntityId(requesterId))) {
      throw new NotFoundError('Share link')
    }

    await shareLinks.delete(link.id)
  }
}
