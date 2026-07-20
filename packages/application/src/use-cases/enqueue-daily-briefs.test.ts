import { describe, expect, it, vi } from 'vitest'
import { User, type EntityId } from '@lifedeck/domain'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { FixedClock, ID } from '@/testing/fakes'
import {
  DAILY_BRIEF_JOB,
  makeEnqueueDailyBriefs,
} from '@/use-cases/enqueue-daily-briefs'

// 10:00 UTC is 07:00 in Sao Paulo (UTC-3) and 10:00 in UTC.
const NOW = new Date('2026-06-22T10:00:00.000Z')

async function addUser(
  users: InMemoryUserRepository,
  id: EntityId,
  timezone: string,
  brief: { enabled: boolean; hour: number | null },
): Promise<void> {
  const user = User.createGuest({
    id,
    displayName: 'Gabriel',
    locale: 'pt',
    timezone,
    createdAt: NOW,
  })
  user.register({
    email: `${id}@example.com`,
    passwordHash: 'x',
    emailVerifiedAt: null,
  })
  user.updateProfile({ briefEnabled: brief.enabled, briefHour: brief.hour })
  await users.save(user)
}

function sweep(users: InMemoryUserRepository, enqueue = vi.fn()) {
  enqueue.mockResolvedValue(undefined)
  return {
    enqueue,
    run: makeEnqueueDailyBriefs({
      users,
      jobQueue: { enqueue },
      clock: new FixedClock(NOW),
    }),
  }
}

describe('enqueueDailyBriefs', () => {
  it('enqueues a brief only for opted-in users whose local briefHour matches', async () => {
    const users = new InMemoryUserRepository()
    await addUser(users, ID.user, 'America/Sao_Paulo', {
      enabled: true,
      hour: 7,
    })
    await addUser(users, ID.otherUser, 'UTC', { enabled: true, hour: 9 })
    const { enqueue, run } = sweep(users)

    const result = await run()

    expect(result).toEqual({ enqueued: 1 })
    expect(enqueue).toHaveBeenCalledOnce()
    expect(enqueue).toHaveBeenCalledWith({
      type: DAILY_BRIEF_JOB,
      payload: { userId: ID.user as string },
      runAt: NOW,
    })
  })

  it('skips users who have not enabled the brief', async () => {
    const users = new InMemoryUserRepository()
    await addUser(users, ID.user, 'America/Sao_Paulo', {
      enabled: false,
      hour: 7,
    })
    const { enqueue, run } = sweep(users)

    expect(await run()).toEqual({ enqueued: 0 })
    expect(enqueue).not.toHaveBeenCalled()
  })

  it('skips an enabled user with no briefHour set', async () => {
    const users = new InMemoryUserRepository()
    await addUser(users, ID.user, 'America/Sao_Paulo', {
      enabled: true,
      hour: null,
    })
    const { enqueue, run } = sweep(users)

    expect(await run()).toEqual({ enqueued: 0 })
    expect(enqueue).not.toHaveBeenCalled()
  })
})
