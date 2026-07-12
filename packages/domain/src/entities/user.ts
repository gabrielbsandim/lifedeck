import { guard } from '@/shared/guard'
import { ValidationError } from '@/shared/domain-error'
import type { EntityId } from '@/shared/id'
import { Email } from '@/value-objects/email'
import {
  CARRY_OVER_MODES,
  type CarryOverMode,
} from '@/value-objects/carry-over-mode'
import { DEFAULT_TIME_ZONE, isTimeZone } from '@/value-objects/time-zone'

const MAX_DISPLAY_NAME_LENGTH = 80
const MAX_AVATAR_URL_LENGTH = 2048

function normalizeAvatarUrl(value: string): string {
  const trimmed = value.trim()
  if (!/^https:\/\//i.test(trimmed)) {
    throw new ValidationError('Avatar URL must be an https URL.')
  }
  return guard.maxLength(trimmed, MAX_AVATAR_URL_LENGTH, 'Avatar URL')
}

function normalizeTimeZone(value: string | undefined): string {
  if (value === undefined) {
    return DEFAULT_TIME_ZONE
  }
  const trimmed = value.trim()
  if (!isTimeZone(trimmed)) {
    throw new ValidationError(`Time zone "${value}" is not a valid IANA zone.`)
  }
  return trimmed
}

export type UserProps = {
  id: EntityId
  displayName: string
  email: string | null
  passwordHash: string | null
  emailVerifiedAt: Date | null
  isGuest: boolean
  locale: string
  timezone: string
  avatarUrl: string | null
  carryOverMode: CarryOverMode
  reminderEmail: boolean
  reminderWhatsapp: boolean
  createdAt: Date
}

export class User {
  private constructor(private props: UserProps) {}

  static createGuest(input: {
    id: EntityId
    displayName: string
    locale: string
    timezone?: string
    avatarUrl?: string | null
    createdAt: Date
  }): User {
    return new User({
      id: input.id,
      displayName: guard.maxLength(
        guard.notEmpty(input.displayName, 'Display name'),
        MAX_DISPLAY_NAME_LENGTH,
        'Display name',
      ),
      email: null,
      passwordHash: null,
      emailVerifiedAt: null,
      isGuest: true,
      locale: guard.notEmpty(input.locale, 'Locale'),
      timezone: normalizeTimeZone(input.timezone),
      avatarUrl: input.avatarUrl ? normalizeAvatarUrl(input.avatarUrl) : null,
      carryOverMode: 'manual',
      // In-app reminders always fire; WhatsApp is on by default (still gated by a
      // linked, verified number), email is opt-in.
      reminderEmail: false,
      reminderWhatsapp: true,
      createdAt: input.createdAt,
    })
  }

  static restore(props: UserProps): User {
    return new User({ ...props })
  }

  get id(): EntityId {
    return this.props.id
  }

  get displayName(): string {
    return this.props.displayName
  }

  get isGuest(): boolean {
    return this.props.isGuest
  }

  get email(): string | null {
    return this.props.email
  }

  get passwordHash(): string | null {
    return this.props.passwordHash
  }

  get emailVerifiedAt(): Date | null {
    return this.props.emailVerifiedAt
  }

  get isEmailVerified(): boolean {
    return this.props.emailVerifiedAt !== null
  }

  get locale(): string {
    return this.props.locale
  }

  get timezone(): string {
    return this.props.timezone
  }

  get avatarUrl(): string | null {
    return this.props.avatarUrl
  }

  setAvatar(url: string): void {
    this.props.avatarUrl = normalizeAvatarUrl(url)
  }

  removeAvatar(): void {
    this.props.avatarUrl = null
  }

  get carryOverMode(): CarryOverMode {
    return this.props.carryOverMode
  }

  setCarryOverMode(mode: string): void {
    this.props.carryOverMode = guard.oneOf(
      mode,
      CARRY_OVER_MODES,
      'Carry-over mode',
    )
  }

  get reminderEmail(): boolean {
    return this.props.reminderEmail
  }

  get reminderWhatsapp(): boolean {
    return this.props.reminderWhatsapp
  }

  setReminderChannels(input: { email?: boolean; whatsapp?: boolean }): void {
    if (input.email !== undefined) {
      this.props.reminderEmail = input.email
    }
    if (input.whatsapp !== undefined) {
      this.props.reminderWhatsapp = input.whatsapp
    }
  }

  setTimezone(timezone: string): void {
    this.props.timezone = normalizeTimeZone(timezone)
  }

  rename(displayName: string): void {
    this.props.displayName = guard.maxLength(
      guard.notEmpty(displayName, 'Display name'),
      MAX_DISPLAY_NAME_LENGTH,
      'Display name',
    )
  }

  register(input: {
    email: string
    passwordHash: string | null
    emailVerifiedAt: Date | null
  }): void {
    this.props.email = Email.create(input.email).value
    this.props.passwordHash = input.passwordHash
    this.props.emailVerifiedAt = input.emailVerifiedAt
    this.props.isGuest = false
  }

  verifyEmail(at: Date): void {
    this.props.emailVerifiedAt = at
  }

  changePassword(passwordHash: string): void {
    this.props.passwordHash = guard.notEmpty(passwordHash, 'Password hash')
  }

  toJSON(): UserProps {
    return { ...this.props }
  }
}
