import { describe, expect, it } from 'vitest'
import { Habit, User, ValidationError, asEntityId } from '@lifedeck/domain'
import { makeLogHabit } from '@/use-cases/log-habit'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryHabitRepository } from '@/testing/in-memory-habit-repository'
import { InMemoryHabitLogRepository } from '@/testing/in-memory-habit-log-repository'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { FixedClock, SequentialIdGenerator, ID } from '@/testing/fakes'

const NOW = new Date('2026-07-20T12:00:00.000Z')
const HABIT = asEntityId('11111111-1111-4111-8111-111111111111')
const LOG_A = asEntityId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
const LOG_B = asEntityId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')

async function setup(ownerId = ID.user) {
  const habits = new InMemoryHabitRepository()
  const habitLogs = new InMemoryHabitLogRepository()
  const users = new InMemoryUserRepository()
  await users.save(
    User.createGuest({
      id: ID.user,
      displayName: 'Gabriel',
      locale: 'en',
      timezone: 'UTC',
      createdAt: NOW,
    }),
  )
  await habits.save(
    Habit.create({
      id: HABIT,
      ownerId,
      title: 'Meditate',
      cadence: { kind: 'daily' },
      createdAt: NOW,
    }),
  )
  const logHabit = makeLogHabit({
    habits,
    habitLogs,
    users,
    ids: new SequentialIdGenerator([LOG_A, LOG_B]),
    clock: new FixedClock(NOW),
  })
  return { habitLogs, logHabit }
}

describe('logHabit', () => {
  it('marks today done by default and reports the streak', async () => {
    const { logHabit } = await setup()

    const view = await logHabit(ID.user, HABIT)

    expect(view.doneToday).toBe(true)
    expect(view.currentStreak).toBe(1)
  })

  it('is idempotent when the same day is logged twice', async () => {
    const { habitLogs, logHabit } = await setup()

    await logHabit(ID.user, HABIT)
    const view = await logHabit(ID.user, HABIT)

    expect(view.currentStreak).toBe(1)
    const logs = await habitLogs.listByHabitsSince([HABIT], '2026-07-01')
    expect(logs).toHaveLength(1)
  })

  it('accepts an explicit past date (backfilling a forgotten day)', async () => {
    const { habitLogs, logHabit } = await setup()

    await logHabit(ID.user, HABIT, { date: '2026-07-19' })

    const logs = await habitLogs.listByHabitsSince([HABIT], '2026-07-01')
    expect(logs.map(log => log.date)).toEqual(['2026-07-19'])
  })

  it('backfilling yesterday extends the streak through today', async () => {
    const { logHabit } = await setup()

    await logHabit(ID.user, HABIT)
    const view = await logHabit(ID.user, HABIT, { date: '2026-07-19' })

    expect(view.currentStreak).toBe(2)
  })

  it('rejects logging a future date', async () => {
    const { logHabit } = await setup()

    await expect(
      logHabit(ID.user, HABIT, { date: '2026-07-21' }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('un-marks a day when done is false', async () => {
    const { habitLogs, logHabit } = await setup()

    await logHabit(ID.user, HABIT)
    const view = await logHabit(ID.user, HABIT, { done: false })

    expect(view.doneToday).toBe(false)
    expect(view.currentStreak).toBe(0)
    expect(await habitLogs.findByHabitAndDate(HABIT, '2026-07-20')).toBeNull()
  })

  it('rejects an unknown habit', async () => {
    const { logHabit } = await setup()
    await expect(
      logHabit(ID.user, asEntityId('00000000-0000-4000-8000-000000000000')),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('rejects a habit owned by someone else', async () => {
    const { logHabit } = await setup(ID.otherUser)
    await expect(logHabit(ID.user, HABIT)).rejects.toBeInstanceOf(NotFoundError)
  })
})
