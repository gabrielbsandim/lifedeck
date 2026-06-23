import { asEntityId } from '@lifedeck/domain'
import { type ShareLinkView } from '@/dtos/share-link-dto'
import { toShareLinkView } from '@/mappers/share-link-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import type { ListRepository } from '@/ports/list-repository'
import type { ShareLinkRepository } from '@/ports/share-link-repository'

type Dependencies = {
  shareLinks: ShareLinkRepository
  lists: ListRepository
}

export function makeListShareLinks({ shareLinks, lists }: Dependencies) {
  return async function listShareLinks(
    requesterId: string,
    listId: string,
  ): Promise<ShareLinkView[]> {
    const list = await lists.findById(asEntityId(listId))
    if (!list || !list.isOwnedBy(asEntityId(requesterId))) {
      throw new NotFoundError('List')
    }

    const links = await shareLinks.listByList(list.id)
    return links.map(toShareLinkView)
  }
}
