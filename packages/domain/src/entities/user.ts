import { guard } from '@/shared/guard'
import type { EntityId } from '@/shared/id'

const MAX_DISPLAY_NAME_LENGTH = 80

export type UserProps = {
  id: EntityId
  displayName: string
  email: string | null
  passwordHash: string | null
  emailVerifiedAt: Date | null
  isGuest: boolean
  locale: string
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

  get locale(): string {
    return this.props.locale
  }

  rename(displayName: string): void {
    this.props.displayName = guard.maxLength(
      guard.notEmpty(displayName, 'Display name'),
      MAX_DISPLAY_NAME_LENGTH,
      'Display name',
    )
  }

  toJSON(): UserProps {
    return { ...this.props }
  }
}
