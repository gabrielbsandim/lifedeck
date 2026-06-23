import { describe, expect, it } from 'vitest'
import { User } from '@lifedeck/domain'
import { makeSendDailyDigest } from '@/use-cases/send-daily-digest'
import type { TaskView } from '@/dtos/task-dto'
import type { DailyBoardView } from '@/use-cases/get-daily-board'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { FakeEmailSender } from '@/testing/fake-email-sender'
import { FixedClock, ID } from '@/testing/fakes'

const NOW = new Date('2026-06-22T09:00:00.000Z')

function board(
  tasks: Array<{ status: string; title: string }>,
): DailyBoardView {
  return {
    list: { id: ID.list } as never,
    tasks: tasks as unknown as TaskView[],
    carryOver: [],
  }
}

async function registeredUser(
  users: InMemoryUserRepository,
  locale = 'pt',
): Promise<void> {
  const user = User.createGuest({
    id: ID.user,
    displayName: 'Gabriel',
    locale,
    createdAt: NOW,
  })
  user.register({
    email: 'gabriel@example.com',
    passwordHash: 'x',
    emailVerifiedAt: null,
  })
  await users.save(user)
}

describe('sendDailyDigest', () => {
  it('emails the summary in the user locale', async () => {
    const users = new InMemoryUserRepository()
    const emailSender = new FakeEmailSender()
    await registeredUser(users, 'pt')
    const sendDailyDigest = makeSendDailyDigest({
      getDailyBoard: async () =>
        board([
          { status: 'completed', title: 'Book venue' },
          { status: 'pending', title: 'Choose cake' },
        ]),
      users,
      emailSender,
      clock: new FixedClock(NOW),
    })

    const result = await sendDailyDigest(ID.user)

    expect(result).toEqual({ sent: true })
    expect(emailSender.digests).toEqual([
      {
        to: 'gabriel@example.com',
        summary: {
          date: '2026-06-22',
          total: 2,
          completed: 1,
          pendingTitles: ['Choose cake'],
        },
        locale: 'pt',
      },
    ])
  })

  it('does nothing for a user without an email', async () => {
    const users = new InMemoryUserRepository()
    const emailSender = new FakeEmailSender()
    await users.save(
      User.createGuest({
        id: ID.user,
        displayName: 'Guest',
        locale: 'en',
        createdAt: NOW,
      }),
    )
    const sendDailyDigest = makeSendDailyDigest({
      getDailyBoard: async () => board([]),
      users,
      emailSender,
      clock: new FixedClock(NOW),
    })

    const result = await sendDailyDigest(ID.user)

    expect(result).toEqual({ sent: false })
    expect(emailSender.digests).toHaveLength(0)
  })
})
