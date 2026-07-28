import { describe, expect, it } from 'vitest'
import { PushDevice, asEntityId } from '@lifedeck/domain'
import { makeRegisterPushDevice } from '@/use-cases/register-push-device'
import { makeUnregisterPushDevice } from '@/use-cases/unregister-push-device'
import { InMemoryPushDeviceRepository } from '@/testing/in-memory-push-device-repository'
import { FixedClock } from '@/testing/fakes'

const USER = asEntityId('1a000000-0000-4000-8000-0000000000a1')
const OTHER = asEntityId('1a000000-0000-4000-8000-0000000000a2')
const DEVICE = asEntityId('1a000000-0000-4000-8000-0000000000b1')
const NEW_DEVICE = asEntityId('1a000000-0000-4000-8000-0000000000b2')
const NOW = new Date('2026-06-22T10:00:00.000Z')
const EARLIER = new Date('2026-06-01T10:00:00.000Z')
const TOKEN = 'ExponentPushToken[abc]'

function setup() {
  const pushDevices = new InMemoryPushDeviceRepository()
  const register = makeRegisterPushDevice({
    pushDevices,
    ids: { generate: () => NEW_DEVICE },
    clock: new FixedClock(NOW),
  })
  const unregister = makeUnregisterPushDevice({ pushDevices })
  return { pushDevices, register, unregister }
}

async function seed(
  pushDevices: InMemoryPushDeviceRepository,
  userId = USER,
): Promise<void> {
  await pushDevices.save(
    PushDevice.create({
      id: DEVICE,
      userId,
      token: TOKEN,
      platform: 'ios',
      createdAt: EARLIER,
    }),
  )
}

describe('registerPushDevice', () => {
  it('stores a device the first time it registers', async () => {
    const { pushDevices, register } = setup()
    await register(USER, { token: TOKEN, platform: 'ios' })
    const stored = await pushDevices.findByToken(TOKEN)
    expect(stored?.toJSON()).toEqual({
      id: NEW_DEVICE,
      userId: USER,
      token: TOKEN,
      platform: 'ios',
      createdAt: NOW,
      lastSeenAt: NOW,
    })
  })

  it('refreshes rather than duplicates on a repeat registration', async () => {
    const { pushDevices, register } = setup()
    await seed(pushDevices)
    await register(USER, { token: TOKEN, platform: 'ios' })
    const stored = await pushDevices.findByToken(TOKEN)
    expect(stored?.toJSON()).toMatchObject({
      id: DEVICE,
      lastSeenAt: NOW,
      createdAt: EARLIER,
    })
    expect(await pushDevices.listByUser(USER)).toHaveLength(1)
  })

  it('moves a phone that is now signed in as someone else', async () => {
    const { pushDevices, register } = setup()
    await seed(pushDevices, OTHER)
    await register(USER, { token: TOKEN, platform: 'android' })
    expect(await pushDevices.listByUser(OTHER)).toEqual([])
    const [moved] = await pushDevices.listByUser(USER)
    expect(moved?.platform).toBe('android')
  })

  it('rejects an unknown platform', async () => {
    const { register } = setup()
    await expect(
      register(USER, { token: TOKEN, platform: 'web' }),
    ).rejects.toThrow()
  })

  it('rejects an empty token', async () => {
    const { register } = setup()
    await expect(
      register(USER, { token: '  ', platform: 'ios' }),
    ).rejects.toThrow()
  })
})

describe('unregisterPushDevice', () => {
  it('removes the caller own device', async () => {
    const { pushDevices, unregister } = setup()
    await seed(pushDevices)
    await unregister(USER, { token: TOKEN })
    expect(await pushDevices.findByToken(TOKEN)).toBeNull()
  })

  it('leaves another user device alone', async () => {
    const { pushDevices, unregister } = setup()
    await seed(pushDevices, OTHER)
    await unregister(USER, { token: TOKEN })
    expect(await pushDevices.findByToken(TOKEN)).not.toBeNull()
  })

  it('is silent about a token it has never seen', async () => {
    const { unregister } = setup()
    await expect(
      unregister(USER, { token: 'unknown' }),
    ).resolves.toBeUndefined()
  })

  it('still validates the payload', async () => {
    const { unregister } = setup()
    await expect(unregister(USER, {})).rejects.toThrow()
  })
})
