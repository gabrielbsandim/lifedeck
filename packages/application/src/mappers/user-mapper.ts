import type { User } from '@taskin/domain'
import type { UserView } from '@/dtos/user-dto'

export function toUserView(user: User): UserView {
  const props = user.toJSON()
  return {
    id: props.id,
    displayName: props.displayName,
    isGuest: props.isGuest,
    locale: props.locale,
    createdAt: props.createdAt.toISOString(),
  }
}
