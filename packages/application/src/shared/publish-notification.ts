import { Notification, type EntityId } from '@lifedeck/domain'
import type { Logger } from '@/ports/logger'
import type { NotificationRepository } from '@/ports/notification-repository'
import type { PushDeviceRepository } from '@/ports/push-device-repository'
import type { PushSender } from '@/ports/push-sender'

export type PublishNotificationInput = {
  id: EntityId
  userId: EntityId
  type: string
  data: Record<string, string>
  createdAt: Date
  // Copy for the lock screen. Omit it to keep a notification in the bell only,
  // which is the right call for anything the user just did themselves.
  alert?: { title: string; body: string }
}

type Dependencies = {
  notifications: NotificationRepository
  // Optional so the app runs with push unconfigured (local development, or a
  // deployment with no Expo project yet). Everything else still works; the
  // notification simply stays in the bell.
  pushDevices?: PushDeviceRepository
  push?: PushSender
  logger: Logger
}

// The single place an in-app notification is created. It exists so push mirrors
// the bell exactly: every caller that decided the user should hear about
// something gets the phone alert for free, and the callers that deliberately
// stay quiet (because WhatsApp already delivered) stay quiet on push too.
//
// The bell write is the reliable part and is awaited. The push is best-effort:
// a provider outage must not roll back a notification the user can already see.
export function makePublishNotification({
  notifications,
  pushDevices,
  push,
  logger,
}: Dependencies) {
  return async function publishNotification(
    input: PublishNotificationInput,
  ): Promise<void> {
    await notifications.save(
      Notification.create({
        id: input.id,
        userId: input.userId,
        type: input.type,
        data: input.data,
        createdAt: input.createdAt,
      }),
    )

    const alert = input.alert
    if (!alert || !pushDevices || !push) {
      return
    }

    try {
      const devices = await pushDevices.listByUser(input.userId)
      if (devices.length === 0) {
        return
      }
      const result = await push.send(
        devices.map(device => ({
          token: device.token,
          title: alert.title,
          body: alert.body,
          // The type rides along so a tap can open the screen the notification
          // is about rather than always landing on the board.
          data: { ...input.data, type: input.type },
        })),
      )
      if (result.invalidTokens.length > 0) {
        // Uninstalled apps and reissued tokens are the normal end of a device's
        // life, not an error. Dropping them keeps the next send from retrying a
        // token that can never work again.
        await pushDevices.deleteByTokens(result.invalidTokens)
      }
    } catch (error) {
      logger.warn('push_send_failed', {
        userId: input.userId,
        type: input.type,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
