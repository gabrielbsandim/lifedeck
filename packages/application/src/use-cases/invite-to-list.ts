import { ShareLink, asEntityId } from '@lifedeck/domain'
import {
  inviteToListSchema,
  type InviteToListInput,
  type ShareLinkView,
} from '@/dtos/share-link-dto'
import { toShareLinkView } from '@/mappers/share-link-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { EmailLocale, EmailSender } from '@/ports/email-sender'
import type { IdGenerator } from '@/ports/id-generator'
import type { ListRepository } from '@/ports/list-repository'
import type { ShareLinkRepository } from '@/ports/share-link-repository'
import type { TokenGenerator } from '@/ports/token-generator'
import type { UnitOfWork } from '@/ports/unit-of-work'

const DAY_MS = 86_400_000

type Dependencies = {
  shareLinks: ShareLinkRepository
  lists: ListRepository
  tokens: TokenGenerator
  ids: IdGenerator
  clock: Clock
  emailSender: EmailSender
  unitOfWork: UnitOfWork
}

export function makeInviteToList({
  shareLinks,
  lists,
  tokens,
  ids,
  clock,
  emailSender,
  unitOfWork,
}: Dependencies) {
  return async function inviteToList(
    requesterId: string,
    listId: string,
    input: InviteToListInput,
    appUrl: string,
    locale: EmailLocale = 'en',
  ): Promise<ShareLinkView> {
    const { email, role, expiresInDays } = inviteToListSchema.parse(input)

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
    await unitOfWork.run(async () => {
      await lists.save(list)
      await shareLinks.save(link)
    })

    const url = `${appUrl.replace(/\/$/, '')}/share/${link.token}`
    await emailSender.sendListInvitation(
      email,
      list.toJSON().title,
      url,
      locale,
    )

    return toShareLinkView(link)
  }
}
