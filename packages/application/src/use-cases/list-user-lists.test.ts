import { describe, expect, it } from 'vitest'
import { List, ListMember, asEntityId, type EntityId } from '@lifedeck/domain'
import { makeCreateList } from '@/use-cases/create-list'
import { makeListUserLists } from '@/use-cases/list-user-lists'
import { parsePageCursor, type ListPageParams } from '@/index'
import { InMemoryListRepository } from '@/testing/in-memory-list-repository'
import { InMemoryMembershipRepository } from '@/testing/in-memory-membership-repository'
import { FixedClock, ID, SequentialIdGenerator } from '@/testing/fakes'

const ALL: ListPageParams = { limit: 50, cursor: null, type: null }

function setup() {
  const lists = new InMemoryListRepository()
  const memberships = new InMemoryMembershipRepository()
  const createList = makeCreateList({
    lists,
    ids: new SequentialIdGenerator([ID.list, ID.task]),
    clock: new FixedClock(new Date('2026-06-21T10:00:00.000Z')),
  })
  return {
    lists,
    memberships,
    createList,
    listUserLists: makeListUserLists({ lists, memberships }),
  }
}

function seedList(
  lists: InMemoryListRepository,
  input: {
    id: string
    ownerId: EntityId
    title: string
    type?: 'daily' | 'standalone'
    createdAt: string
  },
): Promise<void> {
  return lists.save(
    List.create({
      id: asEntityId(input.id),
      ownerId: input.ownerId,
      title: input.title,
      type: input.type ?? 'standalone',
      visibility: 'private',
      referenceDate: input.type === 'daily' ? new Date(input.createdAt) : null,
      createdAt: new Date(input.createdAt),
    }),
  )
}

describe('listUserLists', () => {
  it('returns the lists owned by the user', async () => {
    const { createList, listUserLists } = setup()
    await createList(ID.user, { title: 'Wedding' })
    await createList(ID.otherUser, { title: 'Work' })

    const page = await listUserLists(ID.user, ALL)

    expect(page.items).toHaveLength(1)
    expect(page.items[0]).toMatchObject({ ownerId: ID.user, title: 'Wedding' })
    expect(page.nextCursor).toBeNull()
  })

  it('also returns lists the user has joined as a member', async () => {
    const { createList, memberships, listUserLists } = setup()
    await createList(ID.user, { title: 'Wedding' })
    await createList(ID.otherUser, { title: 'Groceries' })

    await memberships.save(
      ListMember.create({
        id: asEntityId('c3e0f4a6-7d8e-4e90-ab12-3c4d5e6f7081'),
        listId: ID.task,
        userId: ID.user,
        role: 'editor',
        addedAt: new Date('2026-06-21T11:00:00.000Z'),
      }),
    )

    const page = await listUserLists(ID.user, ALL)

    expect(page.items).toHaveLength(2)
    expect(page.items.map(view => view.title).sort()).toEqual([
      'Groceries',
      'Wedding',
    ])
  })

  it('does not duplicate a list the user both owns and is a member of', async () => {
    const { createList, memberships, listUserLists } = setup()
    await createList(ID.user, { title: 'Wedding' })

    await memberships.save(
      ListMember.create({
        id: asEntityId('c3e0f4a6-7d8e-4e90-ab12-3c4d5e6f7081'),
        listId: ID.list,
        userId: ID.user,
        role: 'editor',
        addedAt: new Date('2026-06-21T11:00:00.000Z'),
      }),
    )

    const page = await listUserLists(ID.user, ALL)
    expect(page.items).toHaveLength(1)
  })

  it('returns an empty page when the user has no lists', async () => {
    const { listUserLists } = setup()
    const page = await listUserLists(ID.user, ALL)
    expect(page.items).toEqual([])
    expect(page.nextCursor).toBeNull()
  })

  it('filters by list type', async () => {
    const { lists, listUserLists } = setup()
    await seedList(lists, {
      id: '11111111-1111-4111-8111-111111111111',
      ownerId: ID.user,
      title: 'Daily',
      type: 'daily',
      createdAt: '2026-06-20T10:00:00.000Z',
    })
    await seedList(lists, {
      id: '22222222-2222-4222-8222-222222222222',
      ownerId: ID.user,
      title: 'Project',
      type: 'standalone',
      createdAt: '2026-06-21T10:00:00.000Z',
    })

    const standalone = await listUserLists(ID.user, {
      ...ALL,
      type: 'standalone',
    })
    expect(standalone.items.map(view => view.title)).toEqual(['Project'])

    const daily = await listUserLists(ID.user, { ...ALL, type: 'daily' })
    expect(daily.items.map(view => view.title)).toEqual(['Daily'])
  })

  it('pages newest-first and walks the cursor to exhaustion', async () => {
    const { lists, listUserLists } = setup()
    const seeds = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Oldest',
        createdAt: '2026-06-19T10:00:00.000Z',
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        title: 'Middle',
        createdAt: '2026-06-20T10:00:00.000Z',
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        title: 'Newest',
        createdAt: '2026-06-21T10:00:00.000Z',
      },
    ]
    for (const seed of seeds) {
      await seedList(lists, { ...seed, ownerId: ID.user })
    }

    const first = await listUserLists(ID.user, { ...ALL, limit: 2 })
    expect(first.items.map(view => view.title)).toEqual(['Newest', 'Middle'])
    expect(first.nextCursor).not.toBeNull()

    const second = await listUserLists(ID.user, {
      ...ALL,
      limit: 2,
      cursor: parsePageCursor(first.nextCursor),
    })
    expect(second.items.map(view => view.title)).toEqual(['Oldest'])
    expect(second.nextCursor).toBeNull()
  })
})
