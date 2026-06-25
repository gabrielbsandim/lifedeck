import { describe, expect, it } from 'vitest'
import {
  ApiKey,
  CalendarEvent,
  ChannelIdentity,
  List,
  Notification,
  Subscription,
  Task,
  User,
} from '@lifedeck/domain'
import { makeExportUserData } from '@/use-cases/export-user-data'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { InMemoryListRepository } from '@/testing/in-memory-list-repository'
import { InMemoryTaskRepository } from '@/testing/in-memory-task-repository'
import { InMemoryRecurringTaskRepository } from '@/testing/in-memory-recurring-task-repository'
import { InMemoryShareLinkRepository } from '@/testing/in-memory-share-link-repository'
import { InMemoryNotificationRepository } from '@/testing/in-memory-notification-repository'
import { InMemoryApiKeyRepository } from '@/testing/in-memory-api-key-repository'
import { InMemorySubscriptionRepository } from '@/testing/in-memory-subscription-repository'
import { InMemoryCalendarEventRepository } from '@/testing/in-memory-calendar-event-repository'
import { InMemoryChannelIdentityRepository } from '@/testing/in-memory-channel-identity-repository'
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
  const subscriptions = new InMemorySubscriptionRepository()
  const calendarEvents = new InMemoryCalendarEventRepository()
  const channelIdentities = new InMemoryChannelIdentityRepository()
  return {
    users,
    lists,
    tasks,
    recurringTasks,
    shareLinks,
    notifications,
    apiKeys,
    subscriptions,
    calendarEvents,
    channelIdentities,
    exportUserData: makeExportUserData({
      users,
      lists,
      tasks,
      recurringTasks,
      shareLinks,
      notifications,
      apiKeys,
      subscriptions,
      calendarEvents,
      channelIdentities,
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

    await ctx.subscriptions.save(
      Subscription.create({
        id: ID.verification,
        userId: ID.user,
        plan: 'pro',
        status: 'active',
        provider: 'stripe',
        providerRef: 'sub_1',
        currentPeriodEnd: new Date('2026-07-22T10:00:00.000Z'),
        now: NOW,
      }),
    )
    await ctx.calendarEvents.save(
      CalendarEvent.create({
        id: ID.task,
        ownerId: ID.user,
        title: 'Dentist',
        startsAt: new Date('2026-06-25T09:00:00.000Z'),
        endsAt: new Date('2026-06-25T10:00:00.000Z'),
        reminders: [30],
        now: NOW,
      }),
    )
    const identity = ChannelIdentity.create({
      id: ID.otherUser,
      userId: ID.user,
      channel: 'whatsapp',
      pairingCode: '123456',
      pairingExpiresAt: new Date('2026-06-22T10:10:00.000Z'),
      now: NOW,
    })
    identity.verify('5511999990000', NOW)
    await ctx.channelIdentities.save(identity)

    const result = await ctx.exportUserData(ID.user as string, NOW)

    expect(result.exportedAt).toBe(NOW.toISOString())
    expect(result.profile.displayName).toBe('Gabriel')
    expect(result.lists).toHaveLength(1)
    expect(result.lists[0]?.tasks[0]?.title).toBe('Book venue')
    expect(result.notifications).toHaveLength(1)
    expect(result.apiKeys[0]).not.toHaveProperty('secret')
    expect(result.subscription).toEqual({
      plan: 'pro',
      status: 'active',
      provider: 'stripe',
      currentPeriodEnd: '2026-07-22T10:00:00.000Z',
    })
    expect(result.calendarEvents[0]?.title).toBe('Dentist')
    expect(result.channels).toEqual([
      {
        channel: 'whatsapp',
        address: '+5511999990000',
        verifiedAt: NOW.toISOString(),
      },
    ])
  })

  it('returns empty v2 sections for a user without that data', async () => {
    const ctx = setup()
    await ctx.users.save(
      User.createGuest({
        id: ID.user,
        displayName: 'Bare',
        locale: 'en',
        createdAt: NOW,
      }),
    )
    await ctx.subscriptions.save(
      Subscription.create({
        id: ID.verification,
        userId: ID.user,
        plan: 'free',
        status: 'canceled',
        provider: 'asaas',
        providerRef: 'sub_x',
        currentPeriodEnd: null,
        now: NOW,
      }),
    )

    const result = await ctx.exportUserData(ID.user as string, NOW)

    expect(result.subscription).toEqual({
      plan: 'free',
      status: 'canceled',
      provider: 'asaas',
      currentPeriodEnd: null,
    })
    expect(result.calendarEvents).toEqual([])
    expect(result.channels).toEqual([])
  })

  it('rejects an unknown user', async () => {
    const ctx = setup()
    await expect(
      ctx.exportUserData(ID.user as string, NOW),
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})
