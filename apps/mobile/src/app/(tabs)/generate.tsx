import { ScreenPlaceholder } from '@/components/screen-placeholder'
import { useI18n } from '@/lib/i18n/messages-provider'

export default function GenerateScreen() {
  const { messages } = useI18n()
  return (
    <ScreenPlaceholder
      title={messages.nav.generate}
      subtitle="V4 — WhatsApp-style chat coming soon"
    />
  )
}
