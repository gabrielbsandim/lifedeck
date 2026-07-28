// RN port of apps/web/src/components/connections/connections-panel.tsx: the
// Google Calendar and WhatsApp connection cards. The web shows a QR code as a
// fallback for pairing on another device; on a phone the deep link always
// works, so the QR is dropped and the code is shown for manual sending.
import { Linking, Pressable, Text, View } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { CalendarIcon, CheckSquareIcon } from '@/components/icons'
import { Button, Card } from '@/components/ui'
import { API_BASE_URL, API_PREFIX } from '@/lib/api/config'
import {
  useCalendarConnections,
  useDisconnectCalendar,
} from '@/lib/api/use-calendar-connections'
import {
  useStartWhatsappPairing,
  useWhatsappChannel,
} from '@/lib/api/use-pairing'
import { useSession } from '@/lib/api/use-session'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useThemeColors } from '@/theme/tokens'

/** Calendar + WhatsApp connection cards, shared by onboarding and Settings. */
export function ConnectionsPanel() {
  const session = useSession()
  const features = session.data?.features
  return (
    <View className="gap-3">
      {features?.calendar ? <CalendarConnect /> : null}
      {features?.whatsapp ? <WhatsappConnect /> : null}
    </View>
  )
}

function Row({
  done,
  title,
  body,
  children,
}: {
  done?: boolean
  title: string
  body: string
  children?: React.ReactNode
}) {
  const colors = useThemeColors()
  return (
    <Card className="gap-3 p-4">
      <View className="flex-row items-start gap-3">
        <View
          className={
            done
              ? 'bg-success-soft h-9 w-9 items-center justify-center rounded-full'
              : 'bg-brand-100 h-9 w-9 items-center justify-center rounded-full'
          }
        >
          {done ? (
            <CheckSquareIcon size={18} color={colors.successFg} />
          ) : (
            <CalendarIcon size={18} color={colors.brand.accent} />
          )}
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-ink-800 text-sm font-semibold">{title}</Text>
          <Text className="text-ink-500 mt-0.5 text-sm">{body}</Text>
        </View>
      </View>
      {children}
    </Card>
  )
}

function CalendarConnect() {
  const { messages } = useI18n()
  const t = messages.getStarted
  const cal = messages.calendar
  const session = useSession()
  const user = session.data
  const entitled = Boolean(user?.entitlements?.includes('calendarSync'))
  const connections = useCalendarConnections(Boolean(user?.features?.calendar))
  const disconnect = useDisconnectCalendar()
  const list = connections.data ?? []
  const connected = list.length > 0

  return (
    <Row
      done={connected}
      title={t.calendarTitle}
      body={connected ? t.calendarConnected : t.calendarBody}
    >
      {connected ? (
        <View className="gap-2">
          {list.map(connection => (
            <View
              key={connection.id}
              className="flex-row items-center justify-between gap-2"
            >
              <Text
                className="text-ink-600 min-w-0 flex-1 text-xs"
                numberOfLines={1}
              >
                {connection.accountEmail}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => disconnect.mutate(connection.id)}
                className="px-2 py-1"
              >
                <Text className="text-danger text-xs font-semibold">
                  {cal.disconnectCalendar}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <Button
          variant="ghost"
          className="border-line border"
          disabled={!entitled}
          onPress={() =>
            void WebBrowser.openBrowserAsync(
              `${API_BASE_URL}${API_PREFIX}/calendar/google/connect`,
            )
          }
        >
          {entitled ? t.calendarAction : t.calendarUpgrade}
        </Button>
      )}
    </Row>
  )
}

function WhatsappConnect() {
  const { messages } = useI18n()
  const t = messages.getStarted
  const channel = useWhatsappChannel()
  const start = useStartWhatsappPairing()

  const linked = channel.data?.status === 'linked'
  const pairing = start.data

  function openWhatsapp() {
    const link = pairing?.deepLink
    if (link) {
      void Linking.openURL(link)
    }
  }

  return (
    <Row
      done={linked}
      title={linked ? t.waConnectedTitle : t.whatsappTitle}
      body={linked ? t.waConnectedBody : t.whatsappBody}
    >
      {linked ? null : pairing?.code ? (
        <View className="gap-2">
          <Text className="text-ink-500 text-xs">{t.waWaitingHint}</Text>
          <Button onPress={openWhatsapp} disabled={!pairing.deepLink}>
            {t.waOpen}
          </Button>
          <Text className="text-ink-500 text-xs">{t.waManual}</Text>
          <Text className="text-ink-900 text-lg font-bold">{pairing.code}</Text>
        </View>
      ) : (
        <View className="gap-2">
          <Text className="text-ink-500 text-xs">{t.waStepA}</Text>
          <Button
            isLoading={start.isPending}
            onPress={() => start.mutate(undefined)}
          >
            {t.waConnect}
          </Button>
          {start.isError ? (
            <Text className="text-danger text-xs">{t.whatsappErr}</Text>
          ) : null}
        </View>
      )}
    </Row>
  )
}
