import { describe, expect, it, vi } from 'vitest'
import { User } from '@lifedeck/domain'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { FixedClock, ID } from '@/testing/fakes'
import {
  DAILY_DIGEST_JOB,
  makeEnqueueDailyDigests,
} from '@/use-cases/enqueue-daily-digests'

// 10:00 UTC is 07:00 in Sao Paulo (UTC-3) and 10:00 in UTC.
const NOW = new Date('2026-06-22T10:00:00.000Z')

async function addUser(
  users: InMemoryUserRepository,
  id: typeof ID.user,
  timezone: string,
  withEmail = true,
): Promise<void> {
  const user = User.createGuest({
    id,
    displayName: 'Gabriel',
    locale: 'pt',
    timezone,
    createdAt: NOW,
  })
  if (withEmail) {
    user.register({
      email: `${id}@example.com`,
      passwordHash: 'x',
      emailVerifiedAt: null,
    })
  }
  await users.save(user)
}

describe('enqueueDailyDigests', () => {
  it('enqueues a digest only for users whose local hour matches', async () => {
    const users = new InMemoryUserRepository()
    await addUser(users, ID.user, 'America/Sao_Paulo')
    await addUser(users, ID.otherUser, 'UTC')
    const enqueue = vi.fn().mockResolvedValue(undefined)
    const enqueueDailyDigests = makeEnqueueDailyDigests({
      users,
      jobQueue: { enqueue },
      clock: new FixedClock(NOW),
      digestHour: 7,
    })

    const result = await enqueueDailyDigests()

    expect(result).toEqual({ enqueued: 1 })
    expect(enqueue).toHaveBeenCalledTimes(1)
    expect(enqueue).toHaveBeenCalledWith({
      type: DAILY_DIGEST_JOB,
      payload: { userId: ID.user as string },
      runAt: NOW,
    })
  })

  it('ignores guests without an email', async () => {
    const users = new InMemoryUserRepository()
    await addUser(users, ID.user, 'America/Sao_Paulo', false)
    const enqueue = vi.fn().mockResolvedValue(undefined)
    const enqueueDailyDigests = makeEnqueueDailyDigests({
      users,
      jobQueue: { enqueue },
      clock: new FixedClock(NOW),
      digestHour: 7,
    })

    expect(await enqueueDailyDigests()).toEqual({ enqueued: 0 })
    expect(enqueue).not.toHaveBeenCalled()
  })
})
