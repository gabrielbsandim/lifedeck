import { describe, expect, it } from 'vitest'
import { List, asEntityId } from '@lifedeck/domain'
import { makeInviteToList } from '@/use-cases/invite-to-list'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryListRepository } from '@/testing/in-memory-list-repository'
import { InMemoryShareLinkRepository } from '@/testing/in-memory-share-link-repository'
import { FakeEmailSender } from '@/testing/fake-email-sender'
import {
  FakeUnitOfWork,
  FixedClock,
  FixedTokenGenerator,
  ID,
  SequentialIdGenerator,
} from '@/testing/fakes'

const NOW = new Date('2026-06-21T10:00:00.000Z')
const LINK_ID = asEntityId('7c9e6679-7425-40de-944b-e07fc1f90ae7')

function makeList() {
  return List.create({
    id: ID.list,
    ownerId: ID.user,
    title: 'Wedding',
    type: 'standalone',
    visibility: 'private',
    referenceDate: null,
    createdAt: NOW,
  })
}

function setup() {
  const shareLinks = new InMemoryShareLinkRepository()
  const lists = new InMemoryListRepository()
  const emailSender = new FakeEmailSender()
  return {
    shareLinks,
    lists,
    emailSender,
    inviteToList: makeInviteToList({
      shareLinks,
      lists,
      tokens: new FixedTokenGenerator(['secret-token']),
      ids: new SequentialIdGenerator([LINK_ID]),
      clock: new FixedClock(NOW),
      emailSender,
      unitOfWork: new FakeUnitOfWork(),
    }),
  }
}

describe('inviteToList', () => {
  it('creates a link and emails a localized join URL', async () => {
    const ctx = setup()
    await ctx.lists.save(makeList())

    const view = await ctx.inviteToList(
      ID.user as string,
      ID.list as string,
      { email: 'friend@example.com', role: 'editor' },
      'https://lifedeck.app/',
      'pt',
    )

    expect(view.role).toBe('editor')
    expect(ctx.emailSender.invitations).toEqual([
      {
        to: 'friend@example.com',
        listTitle: 'Wedding',
        url: 'https://lifedeck.app/share/secret-token',
        locale: 'pt',
      },
    ])
    const saved = await ctx.lists.findById(ID.list)
    expect(saved?.toJSON().visibility).toBe('link')
  })

  it('rejects a non-owner', async () => {
    const ctx = setup()
    await ctx.lists.save(makeList())

    await expect(
      ctx.inviteToList(
        ID.otherUser as string,
        ID.list as string,
        { email: 'friend@example.com' },
        'https://lifedeck.app',
      ),
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})
