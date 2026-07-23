import { ScreenPlaceholder } from '@/components/screen-placeholder'
import { useI18n } from '@/lib/i18n/messages-provider'

export default function ListsScreen() {
  const { messages } = useI18n()
  return (
    <ScreenPlaceholder
      title={messages.nav.lists}
      subtitle="V4 — lists coming soon"
    />
  )
}
