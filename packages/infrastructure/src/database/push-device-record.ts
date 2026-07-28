import { PushDevice, asEntityId, toPushPlatform } from '@lifedeck/domain'

export type PushDeviceRecord = {
  id: string
  userId: string
  token: string
  platform: string
  lastSeenAt: Date
  createdAt: Date
}

export function toDomainPushDevice(record: PushDeviceRecord): PushDevice {
  return PushDevice.restore({
    id: asEntityId(record.id),
    userId: asEntityId(record.userId),
    token: record.token,
    platform: toPushPlatform(record.platform),
    lastSeenAt: record.lastSeenAt,
    createdAt: record.createdAt,
  })
}

export function toPushDeviceRecord(device: PushDevice): PushDeviceRecord {
  const props = device.toJSON()
  return {
    id: props.id,
    userId: props.userId,
    token: props.token,
    platform: props.platform,
    lastSeenAt: props.lastSeenAt,
    createdAt: props.createdAt,
  }
}
