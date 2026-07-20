import { describe, expect, it, vi } from 'vitest'
import { Habit, User, asEntityId, type EntityId } from '@lifedeck/domain'
import { InMemoryHabitRepository } from '@/testing/in-memory-habit-repository'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { FixedClock, ID } from '@/testing/fakes'
import {
  HABIT_CHECKIN_JOB,
  makeEnqueueHabitCheckins,
} from '@/use-cases/enqueue-habit-checkins'

// 10:00 UTC is 07:00 in Sao Paulo (UTC-3) and 10:00 in UTC.
const NOW = new Date('2026-07-20T10:00:00.000Z')

const HABIT_A1 = asEntityId('11111111-1111-4111-8111-111111111111')
const HABIT_A2 = asEntityId('22222222-2222-4222-8222-222222222222')
const HABIT_B1 = asEntityId('33333333-3333-4333-8333-333333333333')

async function addUser(
  users: InMemoryUserRepository,
  id: EntityId,
  timezone: string,
): Promise<void> {
  const user = User.createGuest({
    id,
    displayName: 'Gabriel',
    locale: 'pt',
    timezone,
    createdAt: NOW,
  })
  await users.save(user)
}

async function addHabit(
  habits: InMemoryHabitRepository,
  id: EntityId,
  ownerId: EntityId,
  checkinHour: number | null,
  active = true,
): Promise<void> {
  const habit = Habit.create({
    id,
    ownerId,
    title: 'Meditate',
    cadence: { kind: 'daily' },
    checkinHour,
    createdAt: NOW,
  })
  habit.setActive(active)
  await habits.save(habit)
}

function sweep(
  habits: InMemoryHabitRepository,
  users: InMemoryUserRepository,
  enqueue = vi.fn(),
) {
  enqueue.mockResolvedValue(undefined)
  return {
    enqueue,
    run: makeEnqueueHabitCheckins({
      habits,
      users,
      jobQueue: { enqueue },
      clock: new FixedClock(NOW),
    }),
  }
}

describe('enqueueHabitCheckins', () => {
  it('enqueues only habits whose owner local hour matches the check-in hour', async () => {
    const habits = new InMemoryHabitRepository()
    const users = new InMemoryUserRepository()
    await addUser(users, ID.user, 'America/Sao_Paulo')
    await addUser(users, ID.otherUser, 'UTC')
    await addHabit(habits, HABIT_A1, ID.user, 7) // 07:00 local -> matches
    await addHabit(habits, HABIT_A2, ID.user, 9) // same owner, wrong hour
    await addHabit(habits, HABIT_B1, ID.otherUser, 7) // 10:00 UTC != 7
    const { enqueue, run } = sweep(habits, users)

    const result = await run()

    expect(result).toEqual({ enqueued: 1 })
    expect(enqueue).toHaveBeenCalledOnce()
    expect(enqueue).toHaveBeenCalledWith({
      type: HABIT_CHECKIN_JOB,
      payload: { userId: ID.user as string, habitId: HABIT_A1 as string },
      runAt: NOW,
    })
  })

  it('skips habits with no check-in hour and paused habits', async () => {
    const habits = new InMemoryHabitRepository()
    const users = new InMemoryUserRepository()
    await addUser(users, ID.user, 'UTC')
    await addHabit(habits, HABIT_A1, ID.user, null) // no check-in
    await addHabit(habits, HABIT_A2, ID.user, 10, false) // paused
    const { enqueue, run } = sweep(habits, users)

    expect(await run()).toEqual({ enqueued: 0 })
    expect(enqueue).not.toHaveBeenCalled()
  })
})
