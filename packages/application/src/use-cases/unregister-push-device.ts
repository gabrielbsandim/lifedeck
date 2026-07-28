import { asEntityId } from '@lifedeck/domain'
import { unregisterPushDeviceSchema } from '@/dtos/push-device-dto'
import type { PushDeviceRepository } from '@/ports/push-device-repository'

type Dependencies = {
  pushDevices: PushDeviceRepository
}

// Signing out has to stop the alerts: the phone stays in someone's hand and the
// next notification would put the previous user's tasks on its lock screen.
export function makeUnregisterPushDevice({ pushDevices }: Dependencies) {
  return async function unregisterPushDevice(
    userId: string,
    input: unknown,
  ): Promise<void> {
    const dto = unregisterPushDeviceSchema.parse(input)
    const existing = await pushDevices.findByToken(dto.token)
    // Silent when the token is unknown or belongs to someone else: this is
    // called on a best-effort path during sign-out, and a 404 there would only
    // teach a caller which tokens exist.
    if (!existing || existing.userId !== asEntityId(userId)) {
      return
    }
    await pushDevices.deleteByTokens([dto.token])
  }
}
