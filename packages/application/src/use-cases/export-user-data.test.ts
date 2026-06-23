import { describe, expect, it } from 'vitest'
import { ApiKey, List, Notification, Task, User } from '@lifedeck/domain'
import { makeExportUserData } from '@/use-cases/export-user-data'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { InMemoryListRepository } from '@/testing/in-memory-list-repository'
import { InMemoryTaskRepository } from '@/testing/in-memory-task-repository'
import { InMemoryRecurringTaskRepository } from '@/testing/in-memory-recurring-task-repository'
import { InMemoryShareLinkRepository } from '@/testing/in-memory-share-link-repository'
import { InMemoryNotificationRepository } from '@/testing/in-memory-notification-repository'
import { InMemoryApiKeyRepository } from '@/testing/in-memory-api-key-repository'
import { ID } from '@/testing/fakes'

const NOW = new Date('2026-06-22T10:00:00.000Z')

function setup() {
  const users = new InMemoryUserRepository()
  const lists = new InMemoryListRepository()
  const tasks = new InMemoryTaskRepository()
  const recurringTasks = new InMemoryRecurringTaskRepository()
  const shareLinks = new InMemoryShareLinkRepository()
  const notifications = new InMemoryNotificationRepository()
  const apiKeys = new InMemoryApiKeyRepository()
  return {
    users,
    lists,
    tasks,
    recurringTasks,
    shareLinks,
    notifications,
    apiKeys,
    exportUserData: makeExportUserData({
      users,
      lists,
      tasks,
      recurringTasks,
      shareLinks,
      notifications,
      apiKeys,
    }),
  }
}

describe('exportUserData', () => {
  it('aggregates the user data into a single export', async () => {
    const ctx = setup()
    const user = User.createGuest({
      id: ID.user,
      displayName: 'Gabriel',
      locale: 'en',
      createdAt: NOW,
    })
    await ctx.users.save(user)
    await ctx.lists.save(
      List.create({
        id: ID.list,
        ownerId: ID.user,
        title: 'Wedding',
        type: 'standalone',
        visibility: 'private',
        referenceDate: null,
        createdAt: NOW,
      }),
    )
    await ctx.tasks.save(
      Task.create({
        id: ID.task,
        listId: ID.list,
        title: 'Book venue',
        createdAt: NOW,
      }),
    )
    await ctx.notifications.save(
      Notification.create({
        id: ID.verification,
        userId: ID.user,
        type: 'task-assigned',
        data: { taskTitle: 'Book venue' },
        createdAt: NOW,
      }),
    )
    await ctx.apiKeys.save(
      ApiKey.create({
        id: ID.otherUser,
        userId: ID.user,
        name: 'CI',
        prefix: 'tk_live_ci',
        hashedSecret: 'hash',
        scopes: ['tasks:read'],
        expiresAt: null,
        createdAt: NOW,
      }),
    )

    const result = await ctx.exportUserData(ID.user as string, NOW)

    expect(result.exportedAt).toBe(NOW.toISOString())
    expect(result.profile.displayName).toBe('Gabriel')
    expect(result.lists).toHaveLength(1)
    expect(result.lists[0]?.tasks[0]?.title).toBe('Book venue')
    expect(result.notifications).toHaveLength(1)
    expect(result.apiKeys[0]).not.toHaveProperty('secret')
  })

  it('rejects an unknown user', async () => {
    const ctx = setup()
    await expect(
      ctx.exportUserData(ID.user as string, NOW),
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})
