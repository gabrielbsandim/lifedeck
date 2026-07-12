import type { CalendarConnection } from '@lifedeck/domain'
import type { CalendarConnectionView } from '@/dtos/calendar-connection-dto'

export function toCalendarConnectionView(
  connection: CalendarConnection,
): CalendarConnectionView {
  const props = connection.toJSON()
  return {
    id: props.id as string,
    provider: props.provider,
    accountEmail: props.accountEmail,
    isDefault: props.isDefault,
    connectedAt: props.createdAt.toISOString(),
  }
}
