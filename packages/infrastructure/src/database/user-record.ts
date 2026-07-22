import {
  User,
  asEntityId,
  isCarryOverMode,
  isTimeZone,
  sanitizeAssistantProfile,
  type AssistantProfile,
} from '@lifedeck/domain'

export type UserRecord = {
  id: string
  displayName: string
  email: string | null
  passwordHash: string | null
  emailVerified: Date | null
  isGuest: boolean
  locale: string
  timezone: string
  avatarUrl: string | null
  carryOverMode: string
  reminderEmail: boolean
  reminderWhatsapp: boolean
  // Stored JSON; read leniently (unknown -> sanitized profile), written as the
  // concrete AssistantProfile shape.
  assistantProfile: unknown
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
    timezone: isTimeZone(record.timezone) ? record.timezone : 'UTC',
    avatarUrl: record.avatarUrl,
    carryOverMode: isCarryOverMode(record.carryOverMode)
      ? record.carryOverMode
      : 'manual',
    reminderEmail: record.reminderEmail,
    reminderWhatsapp: record.reminderWhatsapp,
    assistantProfile: sanitizeAssistantProfile(record.assistantProfile),
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
    timezone: props.timezone,
    avatarUrl: props.avatarUrl,
    carryOverMode: props.carryOverMode,
    reminderEmail: props.reminderEmail,
    reminderWhatsapp: props.reminderWhatsapp,
    assistantProfile: props.assistantProfile satisfies AssistantProfile,
    createdAt: props.createdAt,
  }
}
