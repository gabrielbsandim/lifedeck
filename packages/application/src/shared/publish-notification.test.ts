import { describe, expect, it, vi } from 'vitest'
import { PushDevice, asEntityId } from '@lifedeck/domain'
import { makePublishNotification } from '@/shared/publish-notification'
import { InMemoryNotificationRepository } from '@/testing/in-memory-notification-repository'
import { InMemoryPushDeviceRepository } from '@/testing/in-memory-push-device-repository'
import type { PushSendResult } from '@/ports/push-sender'

const USER = asEntityId('1a000000-0000-4000-8000-0000000000a1')
const NOTIFICATION = asEntityId('1a000000-0000-4000-8000-0000000000b1')
function deviceId(index: number) {
  return asEntityId(`1a000000-0000-4000-8000-0000000000c${index + 1}`)
}
const NOW = new Date('2026-06-22T10:00:00.000Z')

function logger() {
  return { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}

async function setup(options?: {
  tokens?: string[]
  result?: PushSendResult
  sendFails?: boolean
}) {
  const notifications = new InMemoryNotificationRepository()
  const pushDevices = new InMemoryPushDeviceRepository()
  for (const [index, token] of (options?.tokens ?? []).entries()) {
    await pushDevices.save(
      PushDevice.create({
        id: deviceId(index),
        userId: USER,
        token,
        platform: 'ios',
        createdAt: NOW,
      }),
    )
  }
  const send = options?.sendFails
    ? vi.fn().mockRejectedValue(new Error('expo down'))
    : vi
        .fn()
        .mockResolvedValue(
          options?.result ?? { delivered: 1, invalidTokens: [] },
        )
  const log = logger()
  const publish = makePublishNotification({
    notifications,
    pushDevices,
    push: { send },
    logger: log,
  })
  return { publish, notifications, pushDevices, send, log }
}

const input = {
  id: NOTIFICATION,
  userId: USER,
  type: 'event-reminder',
  data: { eventId: 'e1' },
  createdAt: NOW,
}

describe('publishNotification', () => {
  it('always writes the in-app notification', async () => {
    const { publish, notifications } = await setup()
    await publish(input)
    const [stored] = await notifications.listByUser(USER, 10)
    expect(stored?.toJSON()).toMatchObject({
      id: NOTIFICATION,
      type: 'event-reminder',
      data: { eventId: 'e1' },
    })
  })

  it('stays in the bell when the caller asks for no alert', async () => {
    const { publish, send } = await setup({ tokens: ['t1'] })
    await publish(input)
    expect(send).not.toHaveBeenCalled()
  })

  it('pushes the alert to every registered device', async () => {
    const { publish, send } = await setup({ tokens: ['t1', 't2'] })
    await publish({
      ...input,
      alert: { title: 'Reminder', body: 'Standup at 09:00' },
    })
    expect(send).toHaveBeenCalledWith([
      {
        token: 't1',
        title: 'Reminder',
        body: 'Standup at 09:00',
        data: { eventId: 'e1', type: 'event-reminder' },
      },
      {
        token: 't2',
        title: 'Reminder',
        body: 'Standup at 09:00',
        data: { eventId: 'e1', type: 'event-reminder' },
      },
    ])
  })

  it('skips the provider call when the user has no device', async () => {
    const { publish, send } = await setup()
    await publish({ ...input, alert: { title: 'Reminder', body: 'Soon' } })
    expect(send).not.toHaveBeenCalled()
  })

  it('drops tokens the provider reports as gone', async () => {
    const { publish, pushDevices } = await setup({
      tokens: ['t1', 't2'],
      result: { delivered: 1, invalidTokens: ['t1'] },
    })
    await publish({ ...input, alert: { title: 'Reminder', body: 'Soon' } })
    const left = await pushDevices.listByUser(USER)
    expect(left.map(device => device.token)).toEqual(['t2'])
  })

  it('keeps the notification when the push fails', async () => {
    const { publish, notifications, log } = await setup({
      tokens: ['t1'],
      sendFails: true,
    })
    await publish({ ...input, alert: { title: 'Reminder', body: 'Soon' } })
    expect(await notifications.listByUser(USER, 10)).toHaveLength(1)
    expect(log.warn).toHaveBeenCalledWith('push_send_failed', {
      userId: USER,
      type: 'event-reminder',
      error: 'expo down',
    })
  })

  it('reports a non-error rejection as a string', async () => {
    const notifications = new InMemoryNotificationRepository()
    const pushDevices = new InMemoryPushDeviceRepository()
    await pushDevices.save(
      PushDevice.create({
        id: deviceId(0),
        userId: USER,
        token: 't1',
        platform: 'android',
        createdAt: NOW,
      }),
    )
    const log = logger()
    const publish = makePublishNotification({
      notifications,
      pushDevices,
      push: { send: vi.fn().mockRejectedValue('nope') },
      logger: log,
    })
    await publish({ ...input, alert: { title: 'Reminder', body: 'Soon' } })
    expect(log.warn).toHaveBeenCalledWith('push_send_failed', {
      userId: USER,
      type: 'event-reminder',
      error: 'nope',
    })
  })

  it('works with push unconfigured', async () => {
    const notifications = new InMemoryNotificationRepository()
    const publish = makePublishNotification({
      notifications,
      logger: logger(),
    })
    await publish({ ...input, alert: { title: 'Reminder', body: 'Soon' } })
    expect(await notifications.listByUser(USER, 10)).toHaveLength(1)
  })
})
