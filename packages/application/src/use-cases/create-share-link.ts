import { ShareLink, asEntityId } from '@lifedeck/domain'
import {
  createShareLinkSchema,
  type CreateShareLinkInput,
  type ShareLinkView,
} from '@/dtos/share-link-dto'
import { toShareLinkView } from '@/mappers/share-link-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { ListRepository } from '@/ports/list-repository'
import type { ShareLinkRepository } from '@/ports/share-link-repository'
import type { TokenGenerator } from '@/ports/token-generator'

const DAY_MS = 86_400_000

type Dependencies = {
  shareLinks: ShareLinkRepository
  lists: ListRepository
  tokens: TokenGenerator
  ids: IdGenerator
  clock: Clock
}

export function makeCreateShareLink({
  shareLinks,
  lists,
  tokens,
  ids,
  clock,
}: Dependencies) {
  return async function createShareLink(
    requesterId: string,
    listId: string,
    input: CreateShareLinkInput,
  ): Promise<ShareLinkView> {
    const { role, expiresInDays } = createShareLinkSchema.parse(input)

    const list = await lists.findById(asEntityId(listId))
    if (!list || !list.isOwnedBy(asEntityId(requesterId))) {
      throw new NotFoundError('List')
    }

    const now = clock.now()
    const link = ShareLink.create({
      id: ids.generate(),
      listId: list.id,
      token: tokens.generate(),
      role: role ?? 'viewer',
      expiresAt: expiresInDays
        ? new Date(now.getTime() + expiresInDays * DAY_MS)
        : null,
      createdAt: now,
    })

    list.setVisibility('link', now)
    await lists.save(list)
    await shareLinks.save(link)

    return toShareLinkView(link)
  }
}
