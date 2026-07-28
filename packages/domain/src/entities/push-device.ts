import { guard } from '@/shared/guard'
import type { EntityId } from '@/shared/id'

export const PUSH_PLATFORMS = ['ios', 'android'] as const
export type PushPlatform = (typeof PUSH_PLATFORMS)[number]

// Boundary conversion for a platform string arriving from the API, mirroring
// how the other string unions cross into the domain.
export function toPushPlatform(value: string): PushPlatform {
  return guard.oneOf(value, PUSH_PLATFORMS, 'Push platform')
}

export type PushDeviceProps = {
  id: EntityId
  userId: EntityId
  token: string
  platform: PushPlatform
  createdAt: Date
  lastSeenAt: Date
}

// One installation of the app that agreed to receive push notifications. The
// token is the identity: it is issued per install by the OS and survives across
// sign-ins, so a phone that changes hands keeps the same token and the row moves
// to whoever is signed in now (`claim`) instead of leaving the previous owner's
// notifications going to someone else's lock screen.
export class PushDevice {
  private constructor(private props: PushDeviceProps) {}

  static create(input: {
    id: EntityId
    userId: EntityId
    token: string
    platform: PushPlatform
    createdAt: Date
  }): PushDevice {
    return new PushDevice({
      id: input.id,
      userId: input.userId,
      token: guard.notEmpty(input.token, 'Push token'),
      platform: guard.oneOf(input.platform, PUSH_PLATFORMS, 'Push platform'),
      createdAt: input.createdAt,
      lastSeenAt: input.createdAt,
    })
  }

  static restore(props: PushDeviceProps): PushDevice {
    return new PushDevice({ ...props })
  }

  get id(): EntityId {
    return this.props.id
  }

  get userId(): EntityId {
    return this.props.userId
  }

  get token(): string {
    return this.props.token
  }

  get platform(): PushPlatform {
    return this.props.platform
  }

  // Re-registering refreshes this so a device that has been silent for months
  // can be told apart from one in daily use.
  touch(now: Date): void {
    this.props.lastSeenAt = now
  }

  claim(userId: EntityId, platform: PushPlatform, now: Date): void {
    this.props.userId = userId
    this.props.platform = guard.oneOf(platform, PUSH_PLATFORMS, 'Push platform')
    this.props.lastSeenAt = now
  }

  toJSON(): PushDeviceProps {
    return { ...this.props }
  }
}
