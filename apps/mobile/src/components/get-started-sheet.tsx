import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { ConnectionsPanel } from '@/components/settings/connections-panel'
import { Dialog } from '@/components/ui'
import { useCalendarConnections } from '@/lib/api/use-calendar-connections'
import { useWhatsappChannel } from '@/lib/api/use-pairing'
import { useSession } from '@/lib/api/use-session'
import { useI18n } from '@/lib/i18n/messages-provider'
import { getStartedOpen } from '@/lib/onboarding/get-started'

const DISMISS_KEY = 'ld.get-started-dismissed'

// Starts as dismissed so the sheet never flashes open before the stored flag
// is read back from the keychain.
function useDismissed(): [boolean, () => void] {
  const [dismissed, setDismissed] = useState(true)
  useEffect(() => {
    void SecureStore.getItemAsync(DISMISS_KEY).then(value =>
      setDismissed(value === '1'),
    )
  }, [])
  const dismiss = () => {
    setDismissed(true)
    void SecureStore.setItemAsync(DISMISS_KEY, '1')
  }
  return [dismissed, dismiss]
}

/** First-run sheet: connect Google Calendar and WhatsApp, as on the web. */
export function GetStartedSheet() {
  const { messages } = useI18n()
  const t = messages.getStarted
  const user = useSession().data
  const registered = Boolean(user && !user.isGuest && user.email !== null)
  const calendarFeature = registered && Boolean(user?.features?.calendar)
  const whatsappFeature = registered && Boolean(user?.features?.whatsapp)
  const connections = useCalendarConnections(calendarFeature)
  const whatsapp = useWhatsappChannel(whatsappFeature)
  const [dismissed, dismiss] = useDismissed()

  const open = getStartedOpen({
    registered,
    dismissed,
    calendarFeature,
    calendarEntitled: Boolean(user?.entitlements?.includes('calendarSync')),
    calendarConnected: connections.isSuccess
      ? connections.data.length > 0
      : undefined,
    whatsappFeature,
    whatsappLinked: whatsapp.isSuccess
      ? whatsapp.data?.status === 'linked'
      : undefined,
  })

  return (
    <Dialog open={open} onClose={dismiss} title={t.title} variant="sheet">
      <View className="gap-4">
        <Text className="text-ink-500 text-sm">{t.subtitle}</Text>
        <ConnectionsPanel />
        <Pressable
          accessibilityRole="button"
          onPress={dismiss}
          className="h-10 items-center justify-center rounded-lg"
        >
          <Text className="text-ink-600 text-sm font-medium">{t.later}</Text>
        </Pressable>
        <Text className="text-ink-400 text-center text-xs">
          {t.settingsHint}
        </Text>
      </View>
    </Dialog>
  )
}
