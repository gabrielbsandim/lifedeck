import { makePublishNotification } from '@/shared/publish-notification'
import type { NotificationRepository } from '@/ports/notification-repository'
import type { PushDeviceRepository } from '@/ports/push-device-repository'
import type { PushSender } from '@/ports/push-sender'

const SILENT_LOGGER = {
  error: () => {},
  warn: () => {},
  info: () => {},
}

// Push-free by default. The use case tests care that something was published to
// the user, not how it reached a phone; the fan-out to devices has its own
// tests. Pass the push pair when a test does want to assert on the alert.
export function testPublishNotification(
  notifications: NotificationRepository,
  push?: { pushDevices: PushDeviceRepository; push: PushSender },
) {
  return makePublishNotification({
    notifications,
    pushDevices: push?.pushDevices,
    push: push?.push,
    logger: SILENT_LOGGER,
  })
}
