import type { User } from '@lifedeck/domain'
import type { UserView } from '@/dtos/user-dto'

export function toUserView(user: User): UserView {
  const props = user.toJSON()
  return {
    id: props.id,
    displayName: props.displayName,
    email: props.email,
    isGuest: props.isGuest,
    isEmailVerified: props.emailVerifiedAt !== null,
    hasPassword: props.passwordHash !== null,
    locale: props.locale,
    timezone: props.timezone,
    avatarUrl: props.avatarUrl,
    carryOverMode: props.carryOverMode,
    reminderEmail: props.reminderEmail,
    reminderWhatsapp: props.reminderWhatsapp,
    weatherLocation: props.weatherLocation,
    createdAt: props.createdAt.toISOString(),
  }
}
