import { describe, expect, it } from 'vitest'
import { List, Task, asEntityId } from '@taskin/domain'
import { makeBringTaskToToday } from '@/use-cases/bring-task-to-today'
import { ForbiddenError, NotFoundError } from '@/errors/use-case-error'
import { InMemoryListRepository } from '@/testing/in-memory-list-repository'
import { InMemoryTaskRepository } from '@/testing/in-memory-task-repository'
import { FixedClock, ID, SequentialIdGenerator } from '@/testing/fakes'

const NOW = new Date('2026-06-21T10:00:00.000Z')
const PRIOR_LIST = asEntityId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
const PENDING = asEntityId('cccccccc-cccc-4ccc-8ccc-cccccccccccc')
const TODAY_LIST = asEntityId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
const COPY = asEntityId('ffffffff-ffff-4fff-8fff-ffffffffffff')

async function setup() {
  const lists = new InMemoryListRepository()
  const tasks = new InMemoryTaskRepository()
  await lists.save(
    List.create({
      id: PRIOR_LIST,
      ownerId: ID.user,
      title: '2026-06-20',
      type: 'daily',
      visibility: 'private',
      referenceDate: new Date('2026-06-20T00:00:00.000Z'),
      createdAt: new Date('2026-06-20T10:00:00.000Z'),
    }),
  )
  await tasks.save(
    Task.create({
      id: PENDING,
      listId: PRIOR_LIST,
      title: 'Buy rings',
      observation: 'Gold',
      createdAt: NOW,
    }),
  )
  return {
    lists,
    tasks,
    bringTaskToToday: makeBringTaskToToday({
      lists,
      tasks,
      ids: new SequentialIdGenerator([TODAY_LIST, COPY]),
      clock: new FixedClock(NOW),
    }),
  }
}

describe('bringTaskToToday', () => {
  it('copies the task into today and freezes the original', async () => {
    const ctx = await setup()

    const view = await ctx.bringTaskToToday(
      ID.user as string,
      PENDING as string,
    )

    expect(view).toMatchObject({
      title: 'Buy rings',
      observation: 'Gold',
      carriedFromDate: '2026-06-20',
      listId: TODAY_LIST,
    })
    const original = await ctx.tasks.findById(PENDING)
    expect(original?.isCarriedForward).toBe(true)
    expect(original?.status).toBe('pending')
    expect(await ctx.tasks.listByList(TODAY_LIST)).toHaveLength(1)
  })

  it('rejects bringing a task the user does not own', async () => {
    const ctx = await setup()
    await expect(
      ctx.bringTaskToToday(ID.otherUser as string, PENDING as string),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('rejects an already carried-forward task', async () => {
    const ctx = await setup()
    await ctx.bringTaskToToday(ID.user as string, PENDING as string)
    await expect(
      ctx.bringTaskToToday(ID.user as string, PENDING as string),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('rejects an unknown task', async () => {
    const ctx = await setup()
    await expect(
      ctx.bringTaskToToday(ID.user as string, COPY as string),
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})
