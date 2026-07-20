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
    assistantProfile: {
      homeLocation: props.assistantProfile.homeLocation,
      workLocation: props.assistantProfile.workLocation,
      wakeHour: props.assistantProfile.wakeHour,
      quietHoursStart: props.assistantProfile.quietHoursStart,
      quietHoursEnd: props.assistantProfile.quietHoursEnd,
      briefEnabled: props.assistantProfile.briefEnabled,
      briefHour: props.assistantProfile.briefHour,
      nudgesEnabled: props.assistantProfile.nudgesEnabled,
      people: props.assistantProfile.people.map(person => ({
        name: person.name,
        relationship: person.relationship,
      })),
      notes: [...props.assistantProfile.notes],
    },
    createdAt: props.createdAt.toISOString(),
  }
}
