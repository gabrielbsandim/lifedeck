import { describe, expect, it } from 'vitest'
import { List, Subtask, Task, User, asEntityId } from '@lifedeck/domain'
import { makeBringTaskToToday } from '@/use-cases/bring-task-to-today'
import { ForbiddenError, NotFoundError } from '@/errors/use-case-error'
import { InMemoryListRepository } from '@/testing/in-memory-list-repository'
import { InMemoryTaskRepository } from '@/testing/in-memory-task-repository'
import { InMemorySubtaskRepository } from '@/testing/in-memory-subtask-repository'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import {
  FakeUnitOfWork,
  FixedClock,
  ID,
  SequentialIdGenerator,
} from '@/testing/fakes'

const NOW = new Date('2026-06-21T10:00:00.000Z')
const PRIOR_LIST = asEntityId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
const PENDING = asEntityId('cccccccc-cccc-4ccc-8ccc-cccccccccccc')
const TODAY_LIST = asEntityId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
const COPY = asEntityId('ffffffff-ffff-4fff-8fff-ffffffffffff')

async function setup(timezone?: string) {
  const lists = new InMemoryListRepository()
  const tasks = new InMemoryTaskRepository()
  const subtasks = new InMemorySubtaskRepository()
  const users = new InMemoryUserRepository()
  await users.save(
    User.createGuest({
      id: ID.user,
      displayName: 'Gabriel',
      locale: 'en',
      timezone,
      createdAt: NOW,
    }),
  )
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
    users,
    bringTaskToToday: makeBringTaskToToday({
      lists,
      tasks,
      subtasks,
      users,
      ids: new SequentialIdGenerator([TODAY_LIST, COPY]),
      clock: new FixedClock(NOW),
      unitOfWork: new FakeUnitOfWork(),
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

  it("provisions today's list using the user's local civil day", async () => {
    const ctx = await setup('Pacific/Kiritimati')

    await ctx.bringTaskToToday(ID.user as string, PENDING as string)

    const todayList = await ctx.lists.findById(TODAY_LIST)
    // 2026-06-21T10:00Z is already 2026-06-22 in UTC+14
    expect(todayList?.toJSON().referenceDate?.toISOString()).toBe(
      '2026-06-22T00:00:00.000Z',
    )
  })

  it('rejects an unknown task', async () => {
    const ctx = await setup()
    await expect(
      ctx.bringTaskToToday(ID.user as string, COPY as string),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('copies the subtasks onto the brought-forward task', async () => {
    const SUB_A = asEntityId('11111111-1111-4111-8111-111111111111')
    const SUB_B = asEntityId('22222222-2222-4222-8222-222222222222')
    const SUB_COPY_A = asEntityId('33333333-3333-4333-8333-333333333333')
    const SUB_COPY_B = asEntityId('44444444-4444-4444-8444-444444444444')
    const lists = new InMemoryListRepository()
    const tasks = new InMemoryTaskRepository()
    const subtasks = new InMemorySubtaskRepository()
    const users = new InMemoryUserRepository()
    await users.save(
      User.createGuest({
        id: ID.user,
        displayName: 'Gabriel',
        locale: 'en',
        createdAt: NOW,
      }),
    )
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
        createdAt: NOW,
      }),
    )
    const doneSub = Subtask.create({
      id: SUB_A,
      taskId: PENDING,
      title: 'Pick metal',
      position: 0,
      createdAt: NOW,
    })
    doneSub.complete(NOW)
    await subtasks.save(doneSub)
    await subtasks.save(
      Subtask.create({
        id: SUB_B,
        taskId: PENDING,
        title: 'Get sizes',
        position: 1,
        createdAt: NOW,
      }),
    )

    const bringTaskToToday = makeBringTaskToToday({
      lists,
      tasks,
      subtasks,
      users,
      ids: new SequentialIdGenerator([
        TODAY_LIST,
        COPY,
        SUB_COPY_A,
        SUB_COPY_B,
      ]),
      clock: new FixedClock(NOW),
      unitOfWork: new FakeUnitOfWork(),
    })

    const view = await bringTaskToToday(ID.user as string, PENDING as string)

    expect(view.subtasks).toEqual({ total: 2, completed: 1 })
    const copied = await subtasks.listByTask(COPY)
    expect(copied.map(subtask => subtask.toJSON().title)).toEqual([
      'Pick metal',
      'Get sizes',
    ])
    expect(copied.map(subtask => subtask.status)).toEqual([
      'completed',
      'pending',
    ])
  })
})
