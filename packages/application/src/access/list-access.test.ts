import { describe, expect, it } from 'vitest'
import { List, ListMember } from '@lifedeck/domain'
import { resolveListAccess } from '@/access/list-access'
import { InMemoryMembershipRepository } from '@/testing/in-memory-membership-repository'
import { ID } from '@/testing/fakes'

const NOW = new Date('2026-06-21T10:00:00.000Z')

function makeList(visibility: 'private' | 'link' = 'private') {
  return List.create({
    id: ID.list,
    ownerId: ID.user,
    title: 'Wedding',
    type: 'standalone',
    visibility,
    referenceDate: null,
    createdAt: NOW,
  })
}

async function withMember(role: 'editor' | 'viewer') {
  const memberships = new InMemoryMembershipRepository()
  await memberships.save(
    ListMember.create({
      id: ID.task,
      listId: ID.list,
      userId: ID.otherUser,
      role,
      addedAt: NOW,
    }),
  )
  return memberships
}

describe('resolveListAccess', () => {
  it('grants the owner full access', async () => {
    const memberships = new InMemoryMembershipRepository()
    expect(await resolveListAccess(makeList(), ID.user, memberships)).toEqual({
      canRead: true,
      canEdit: true,
    })
  })

  it('hides a private list from non-members', async () => {
    const memberships = new InMemoryMembershipRepository()
    expect(
      await resolveListAccess(makeList(), ID.otherUser, memberships),
    ).toEqual({ canRead: false, canEdit: false })
    expect(await resolveListAccess(makeList(), null, memberships)).toEqual({
      canRead: false,
      canEdit: false,
    })
  })

  it('lets an editor member read and edit', async () => {
    const memberships = await withMember('editor')
    expect(
      await resolveListAccess(makeList(), ID.otherUser, memberships),
    ).toEqual({ canRead: true, canEdit: true })
  })

  it('lets a viewer member read but not edit', async () => {
    const memberships = await withMember('viewer')
    expect(
      await resolveListAccess(makeList(), ID.otherUser, memberships),
    ).toEqual({ canRead: true, canEdit: false })
  })

  it('lets anyone read a link-shared list but not edit it', async () => {
    const memberships = new InMemoryMembershipRepository()
    expect(
      await resolveListAccess(makeList('link'), null, memberships),
    ).toEqual({ canRead: true, canEdit: false })
  })
})
