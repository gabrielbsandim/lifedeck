import { describe, expect, it } from 'vitest'
import { List, ShareLink, User, asEntityId } from '@lifedeck/domain'
import { makeJoinListByToken } from '@/use-cases/join-list-by-token'
import { makeListMembers } from '@/use-cases/list-members'
import { makeRemoveMember } from '@/use-cases/remove-member'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryListRepository } from '@/testing/in-memory-list-repository'
import { InMemoryShareLinkRepository } from '@/testing/in-memory-share-link-repository'
import { InMemoryMembershipRepository } from '@/testing/in-memory-membership-repository'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { FixedClock, ID, SequentialIdGenerator } from '@/testing/fakes'

const NOW = new Date('2026-06-21T10:00:00.000Z')
const MEMBER_ID = asEntityId('7c9e6679-7425-40de-944b-e07fc1f90ae7')

function makeList() {
  return List.create({
    id: ID.list,
    ownerId: ID.user,
    title: 'Wedding',
    type: 'standalone',
    visibility: 'link',
    referenceDate: null,
    createdAt: NOW,
  })
}

async function setup(role: 'editor' | 'viewer' = 'editor') {
  const lists = new InMemoryListRepository()
  const shareLinks = new InMemoryShareLinkRepository()
  const memberships = new InMemoryMembershipRepository()
  const users = new InMemoryUserRepository()
  await users.save(
    User.createGuest({
      id: ID.otherUser,
      displayName: 'Ana',
      locale: 'en',
      createdAt: NOW,
    }),
  )
  await lists.save(makeList())
  await shareLinks.save(
    ShareLink.create({
      id: ID.task,
      listId: ID.list,
      token: 'secret-token',
      role,
      expiresAt: null,
      createdAt: NOW,
    }),
  )
  return {
    memberships,
    joinListByToken: makeJoinListByToken({
      shareLinks,
      lists,
      memberships,
      users,
      ids: new SequentialIdGenerator([MEMBER_ID]),
      clock: new FixedClock(NOW),
    }),
    listMembers: makeListMembers({ lists, memberships, users }),
    removeMember: makeRemoveMember({ lists, memberships }),
  }
}

describe('membership', () => {
  it('joins a list via token with the link role', async () => {
    const { joinListByToken } = await setup('editor')

    const member = await joinListByToken(ID.otherUser, 'secret-token')

    expect(member).toMatchObject({
      listId: ID.list,
      userId: ID.otherUser,
      role: 'editor',
    })
  })

  it('is idempotent when joining twice', async () => {
    const { joinListByToken, memberships } = await setup()

    const first = await joinListByToken(ID.otherUser, 'secret-token')
    const second = await joinListByToken(ID.otherUser, 'secret-token')

    expect(second.id).toBe(first.id)
    expect(await memberships.listByList(ID.list)).toHaveLength(1)
  })

  it('rejects joining with an unknown token', async () => {
    const { joinListByToken } = await setup()
    await expect(joinListByToken(ID.otherUser, 'nope')).rejects.toThrow(
      NotFoundError,
    )
  })

  it('lists members for the owner and hides from others', async () => {
    const { joinListByToken, listMembers } = await setup()
    await joinListByToken(ID.otherUser, 'secret-token')

    expect(await listMembers(ID.user, ID.list)).toHaveLength(1)
    await expect(listMembers(ID.otherUser, ID.list)).rejects.toThrow(
      NotFoundError,
    )
  })

  it('removes a member for the owner', async () => {
    const { joinListByToken, removeMember, listMembers } = await setup()
    await joinListByToken(ID.otherUser, 'secret-token')

    await removeMember(ID.user, ID.list, ID.otherUser)

    expect(await listMembers(ID.user, ID.list)).toEqual([])
  })

  it('rejects removing a member by a non-owner', async () => {
    const { joinListByToken, removeMember } = await setup()
    await joinListByToken(ID.otherUser, 'secret-token')

    await expect(
      removeMember(ID.otherUser, ID.list, ID.otherUser),
    ).rejects.toThrow(NotFoundError)
  })

  it('rejects removing a non-existent member', async () => {
    const { removeMember } = await setup()
    await expect(removeMember(ID.user, ID.list, ID.otherUser)).rejects.toThrow(
      NotFoundError,
    )
  })
})
