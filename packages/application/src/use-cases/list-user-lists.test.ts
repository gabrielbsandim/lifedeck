import { describe, expect, it } from 'vitest'
import { ListMember, asEntityId } from '@lifedeck/domain'
import { makeCreateList } from '@/use-cases/create-list'
import { makeListUserLists } from '@/use-cases/list-user-lists'
import { InMemoryListRepository } from '@/testing/in-memory-list-repository'
import { InMemoryMembershipRepository } from '@/testing/in-memory-membership-repository'
import { FixedClock, ID, SequentialIdGenerator } from '@/testing/fakes'

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

describe('listUserLists', () => {
  it('returns the lists owned by the user', async () => {
    const { createList, listUserLists } = setup()
    await createList(ID.user, { title: 'Wedding' })
    await createList(ID.otherUser, { title: 'Work' })

    const views = await listUserLists(ID.user)

    expect(views).toHaveLength(1)
    expect(views[0]).toMatchObject({ ownerId: ID.user, title: 'Wedding' })
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

    const views = await listUserLists(ID.user)

    expect(views).toHaveLength(2)
    expect(views.map(view => view.title).sort()).toEqual([
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

    expect(await listUserLists(ID.user)).toHaveLength(1)
  })

  it('returns an empty array when the user has no lists', async () => {
    const { listUserLists } = setup()
    expect(await listUserLists(ID.user)).toEqual([])
  })
})
