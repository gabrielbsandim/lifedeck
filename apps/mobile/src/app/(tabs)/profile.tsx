import { ScreenPlaceholder } from '@/components/screen-placeholder'
import { useI18n } from '@/lib/i18n/messages-provider'

export default function ProfileScreen() {
  const { messages } = useI18n()
  return (
    <ScreenPlaceholder
      title={messages.nav.profile}
      subtitle="V4 — settings hub coming soon"
    />
  )
}
