import { guard } from '@/shared/guard'
import type { EntityId } from '@/shared/id'
import { Email } from '@/value-objects/email'
import {
  CARRY_OVER_MODES,
  type CarryOverMode,
} from '@/value-objects/carry-over-mode'

const MAX_DISPLAY_NAME_LENGTH = 80

export type UserProps = {
  id: EntityId
  displayName: string
  email: string | null
  passwordHash: string | null
  emailVerifiedAt: Date | null
  isGuest: boolean
  locale: string
  carryOverMode: CarryOverMode
  createdAt: Date
}

export class User {
  private constructor(private props: UserProps) {}

  static createGuest(input: {
    id: EntityId
    displayName: string
    locale: string
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
      carryOverMode: 'manual',
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
