import { describe, expect, it, vi } from 'vitest'
import { User, type EntityId } from '@lifedeck/domain'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { FixedClock, ID } from '@/testing/fakes'
import { NUDGE_JOB, makeEnqueueNudges } from '@/use-cases/enqueue-nudges'

// 21:00 UTC is 18:00 in Sao Paulo (UTC-3) and 21:00 in UTC.
const NOW = new Date('2026-07-20T21:00:00.000Z')

async function addUser(
  users: InMemoryUserRepository,
  id: EntityId,
  timezone: string,
  nudgesEnabled = true,
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
  user.updateProfile({ nudgesEnabled })
  await users.save(user)
}

function sweep(users: InMemoryUserRepository, enqueue = vi.fn()) {
  enqueue.mockResolvedValue(undefined)
  return {
    enqueue,
    run: makeEnqueueNudges({
      users,
      jobQueue: { enqueue },
      clock: new FixedClock(NOW),
      nudgeHour: 18,
    }),
  }
}

describe('enqueueNudges', () => {
  it('enqueues a nudge only for users at the nudge hour in their zone', async () => {
    const users = new InMemoryUserRepository()
    await addUser(users, ID.user, 'America/Sao_Paulo') // 18:00 local -> matches
    await addUser(users, ID.otherUser, 'UTC') // 21:00 local -> no
    const { enqueue, run } = sweep(users)

    const result = await run()

    expect(result).toEqual({ enqueued: 1 })
    expect(enqueue).toHaveBeenCalledOnce()
    expect(enqueue).toHaveBeenCalledWith({
      type: NUDGE_JOB,
      payload: { userId: ID.user as string },
      runAt: NOW,
    })
  })

  it('skips users who opted out of nudges', async () => {
    const users = new InMemoryUserRepository()
    await addUser(users, ID.user, 'America/Sao_Paulo', false)
    const { enqueue, run } = sweep(users)

    expect(await run()).toEqual({ enqueued: 0 })
    expect(enqueue).not.toHaveBeenCalled()
  })
})
