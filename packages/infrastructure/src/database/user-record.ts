import { User, asEntityId, isCarryOverMode } from '@lifedeck/domain'

export type UserRecord = {
  id: string
  displayName: string
  email: string | null
  passwordHash: string | null
  emailVerified: Date | null
  isGuest: boolean
  locale: string
  carryOverMode: string
  createdAt: Date
}

export function toDomainUser(record: UserRecord): User {
  return User.restore({
    id: asEntityId(record.id),
    displayName: record.displayName,
    email: record.email,
    passwordHash: record.passwordHash,
    emailVerifiedAt: record.emailVerified,
    isGuest: record.isGuest,
    locale: record.locale,
    carryOverMode: isCarryOverMode(record.carryOverMode)
      ? record.carryOverMode
      : 'manual',
    createdAt: record.createdAt,
  })
}

export function toUserRecord(user: User): UserRecord {
  const props = user.toJSON()
  return {
    id: props.id,
    displayName: props.displayName,
    email: props.email,
    passwordHash: props.passwordHash,
    emailVerified: props.emailVerifiedAt,
    isGuest: props.isGuest,
    locale: props.locale,
    carryOverMode: props.carryOverMode,
    createdAt: props.createdAt,
  }
}
