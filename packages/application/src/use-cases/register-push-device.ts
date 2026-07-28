import { PushDevice, asEntityId, toPushPlatform } from '@lifedeck/domain'
import { registerPushDeviceSchema } from '@/dtos/push-device-dto'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { PushDeviceRepository } from '@/ports/push-device-repository'

type Dependencies = {
  pushDevices: PushDeviceRepository
  ids: IdGenerator
  clock: Clock
}

// Called on every app start once the OS permission is granted, not just the
// first time: the token can be reissued by the OS, and re-registering is how a
// device that has been reinstalled comes back. That makes this an upsert keyed
// on the token rather than an insert.
export function makeRegisterPushDevice({
  pushDevices,
  ids,
  clock,
}: Dependencies) {
  return async function registerPushDevice(
    userId: string,
    input: unknown,
  ): Promise<void> {
    const dto = registerPushDeviceSchema.parse(input)
    const platform = toPushPlatform(dto.platform)
    const owner = asEntityId(userId)
    const now = clock.now()

    const existing = await pushDevices.findByToken(dto.token)
    if (existing) {
      // The same phone, now signed in as someone else: move the registration
      // rather than leaving one person's alerts going to another's lock screen.
      if (existing.userId === owner) {
        existing.touch(now)
      } else {
        existing.claim(owner, platform, now)
      }
      await pushDevices.save(existing)
      return
    }

    await pushDevices.save(
      PushDevice.create({
        id: ids.generate(),
        userId: owner,
        token: dto.token,
        platform,
        createdAt: now,
      }),
    )
  }
}
