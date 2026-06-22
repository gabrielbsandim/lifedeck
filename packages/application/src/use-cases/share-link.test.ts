import { describe, expect, it } from 'vitest'
import { List, ShareLink, asEntityId } from '@taskin/domain'
import { makeCreateShareLink } from '@/use-cases/create-share-link'
import { makeListShareLinks } from '@/use-cases/list-share-links'
import { makeRevokeShareLink } from '@/use-cases/revoke-share-link'
import { makeGetSharedBoard } from '@/use-cases/get-shared-board'
import { makeCreateTask } from '@/use-cases/create-task'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryListRepository } from '@/testing/in-memory-list-repository'
import { InMemoryTaskRepository } from '@/testing/in-memory-task-repository'
import { InMemoryShareLinkRepository } from '@/testing/in-memory-share-link-repository'
import { InMemoryMembershipRepository } from '@/testing/in-memory-membership-repository'
import {
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
  const tasks = new InMemoryTaskRepository()
  const clock = new FixedClock(NOW)
  return {
    shareLinks,
    lists,
    tasks,
    clock,
    createShareLink: makeCreateShareLink({
      shareLinks,
      lists,
      tokens: new FixedTokenGenerator(['secret-token']),
      ids: new SequentialIdGenerator([LINK_ID]),
      clock,
    }),
    listShareLinks: makeListShareLinks({ shareLinks, lists }),
    revokeShareLink: makeRevokeShareLink({ shareLinks, lists }),
    getSharedBoard: makeGetSharedBoard({ shareLinks, lists, tasks, clock }),
    createTask: makeCreateTask({
      tasks,
      lists,
      memberships: new InMemoryMembershipRepository(),
      ids: new SequentialIdGenerator([ID.task]),
      clock,
    }),
  }
}

describe('share links', () => {
  it('creates a link, marks the list shareable, and lists it', async () => {
    const { lists, createShareLink, listShareLinks } = setup()
    await lists.save(makeList())

    const view = await createShareLink(ID.user, ID.list, {})

    expect(view).toMatchObject({
      token: 'secret-token',
      role: 'viewer',
      listId: ID.list,
    })
    const stored = await lists.findById(ID.list)
    expect(stored?.visibility).toBe('link')
    expect(await listShareLinks(ID.user, ID.list)).toHaveLength(1)
  })

  it('sets an expiry when requested', async () => {
    const { lists, createShareLink } = setup()
    await lists.save(makeList())

    const view = await createShareLink(ID.user, ID.list, { expiresInDays: 2 })

    expect(view.expiresAt).toBe('2026-06-23T10:00:00.000Z')
  })

  it('hides the list from non-owners on create and list', async () => {
    const { lists, createShareLink, listShareLinks } = setup()
    await lists.save(makeList())

    await expect(createShareLink(ID.otherUser, ID.list, {})).rejects.toThrow(
      NotFoundError,
    )
    await expect(listShareLinks(ID.otherUser, ID.list)).rejects.toThrow(
      NotFoundError,
    )
  })

  it('returns the shared board to anyone holding the token', async () => {
    const { lists, createShareLink, getSharedBoard, createTask } = setup()
    await lists.save(makeList())
    await createTask(ID.user, { listId: ID.list, title: 'Buy flowers' })
    await createShareLink(ID.user, ID.list, {})

    const board = await getSharedBoard('secret-token')

    expect(board.role).toBe('viewer')
    expect(board.list.id).toBe(ID.list)
    expect(board.tasks).toHaveLength(1)
  })

  it('rejects an unknown token', async () => {
    const { getSharedBoard } = setup()
    await expect(getSharedBoard('nope')).rejects.toThrow(NotFoundError)
  })

  it('rejects a token whose list no longer exists', async () => {
    const { shareLinks, getSharedBoard } = setup()
    await shareLinks.save(
      ShareLink.create({
        id: ID.task,
        listId: ID.list,
        token: 'orphan-token',
        role: 'viewer',
        expiresAt: null,
        createdAt: NOW,
      }),
    )
    await expect(getSharedBoard('orphan-token')).rejects.toThrow(NotFoundError)
  })

  it('rejects an expired token', async () => {
    const { lists, shareLinks, getSharedBoard } = setup()
    await lists.save(makeList())
    await shareLinks.save(
      ShareLink.create({
        id: ID.task,
        listId: ID.list,
        token: 'old-token',
        role: 'viewer',
        expiresAt: new Date('2026-06-20T00:00:00.000Z'),
        createdAt: new Date('2026-06-19T00:00:00.000Z'),
      }),
    )
    await expect(getSharedBoard('old-token')).rejects.toThrow(NotFoundError)
  })

  it('revokes a link for the owner and hides it from others', async () => {
    const { lists, createShareLink, revokeShareLink, listShareLinks } = setup()
    await lists.save(makeList())
    await createShareLink(ID.user, ID.list, {})

    await expect(revokeShareLink(ID.otherUser, LINK_ID)).rejects.toThrow(
      NotFoundError,
    )
    await revokeShareLink(ID.user, LINK_ID)
    expect(await listShareLinks(ID.user, ID.list)).toEqual([])
  })

  it('rejects revoking an unknown link', async () => {
    const { revokeShareLink } = setup()
    await expect(revokeShareLink(ID.user, LINK_ID)).rejects.toThrow(
      NotFoundError,
    )
  })
})
