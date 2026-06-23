import type { User } from '@taskin/domain'
import type { UserView } from '@/dtos/user-dto'

export function toUserView(user: User): UserView {
  const props = user.toJSON()
  return {
    id: props.id,
    displayName: props.displayName,
    email: props.email,
    isGuest: props.isGuest,
    isEmailVerified: props.emailVerifiedAt !== null,
    locale: props.locale,
    carryOverMode: props.carryOverMode,
    createdAt: props.createdAt.toISOString(),
  }
}
