import { ScreenPlaceholder } from '@/components/screen-placeholder'
import { useI18n } from '@/lib/i18n/messages-provider'

export default function TodayScreen() {
  const { messages } = useI18n()
  return (
    <ScreenPlaceholder
      title={messages.nav.today}
      subtitle="V4 — daily board coming soon"
    />
  )
}
