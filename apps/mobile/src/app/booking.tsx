// The phone's host view of apps/web/src/components/booking/host: bookings to
// answer, the link to share, and a read-only look at services and hours. The
// setup wizard and every editor stay on the web in V5.
import { useState } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import type { BookingSetupView } from '@lifedeck/application'
import type { Messages } from '@lifedeck/i18n'
import { BookingsList } from '@/components/booking/bookings-list'
import { Badge, Button, Card, Screen, Skeleton, Tabs } from '@/components/ui'
import { API_BASE_URL } from '@/lib/api/config'
import {
  useBookingSetup,
  useBookingTrial,
  useStartBookingTrial,
} from '@/lib/api/use-booking'
import { useSession } from '@/lib/api/use-session'
import { useWebCheckout } from '@/lib/billing/use-web-checkout'
import {
  bookingPageUrl,
  weeklyByDay,
  whatsappShareUrl,
} from '@/lib/booking/host'
import { useI18n } from '@/lib/i18n/messages-provider'
import { weekdayLabels } from '@/lib/weekdays'

type Panel = 'bookings' | 'services' | 'hours'
type HostCopy = Messages['bookingHost']

type Places = Messages['booking']['places']

function placeLabel(places: Places, kind: string): string {
  return Object.hasOwn(places, kind) ? places[kind as keyof Places] : kind
}

const WEB_BOOKING_URL = `${API_BASE_URL.replace(/\/+$/, '')}/booking`

function openWeb() {
  void Linking.openURL(WEB_BOOKING_URL)
}

function WebHint({ t }: { t: HostCopy }) {
  return (
    <View className="flex-row flex-wrap items-center justify-between gap-2">
      <Text className="text-ink-500 flex-1 text-xs">{t.mobile.editHint}</Text>
      <Button variant="ghost" onPress={openWeb}>
        {t.mobile.openWeb}
      </Button>
    </View>
  )
}

function LinkCard({
  page,
  t,
}: {
  page: NonNullable<BookingSetupView['page']>
  t: HostCopy
}) {
  const url = bookingPageUrl(API_BASE_URL, page.slug)
  const [copied, setCopied] = useState(false)
  return (
    <Card className="gap-3 p-4">
      <Text className="text-ink-500 text-xs font-semibold uppercase">
        {t.link.label}
      </Text>
      <Text className="text-ink-900 text-[15px] font-semibold" selectable>
        {url.replace(/^https?:\/\//, '')}
      </Text>
      {!page.active ? <Badge>{t.link.paused}</Badge> : null}
      <View className="flex-row flex-wrap gap-2">
        <Button
          onPress={async () => {
            await Clipboard.setStringAsync(url)
            setCopied(true)
          }}
        >
          {copied ? t.link.copied : t.link.copy}
        </Button>
        <Button
          variant="ghost"
          onPress={() =>
            void Linking.openURL(
              whatsappShareUrl(t.link.shareText.replace('{url}', url)),
            )
          }
        >
          {t.link.share}
        </Button>
      </View>
    </Card>
  )
}

function ServicesView({
  setup,
  messages,
}: {
  setup: BookingSetupView
  messages: Messages
}) {
  const t = messages.bookingHost
  const active = setup.services.filter(service => service.active)
  return (
    <View className="gap-3">
      {active.length === 0 ? (
        <Text className="text-ink-500 text-sm">{t.services.empty}</Text>
      ) : null}
      {active.map(service => (
        <Card key={service.id} className="gap-1 p-4">
          <Text className="text-ink-900 font-semibold">{service.name}</Text>
          <Text className="text-ink-500 text-sm">
            {[
              messages.booking.minutes.replace(
                '{n}',
                String(service.durationMin),
              ),
              placeLabel(messages.booking.places, service.location.kind),
              service.priceLabel,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {service.requiresApproval ? (
            <Text className="text-ink-400 text-xs">{t.services.approval}</Text>
          ) : null}
        </Card>
      ))}
      <WebHint t={t} />
    </View>
  )
}

function HoursView({
  setup,
  t,
  locale,
}: {
  setup: BookingSetupView
  t: HostCopy
  locale: string
}) {
  const labels = weekdayLabels(locale)
  const zone = setup.page?.timezone ?? ''
  return (
    <View className="gap-3">
      <Card className="gap-2 p-4">
        <Text className="text-ink-500 text-xs">
          {t.hours.timezoneNote.replace('{zone}', zone)}
        </Text>
        {weeklyByDay(setup.weekly).map(day => (
          <View key={day.weekday} className="flex-row justify-between gap-3">
            <Text className="text-ink-800 text-sm font-semibold capitalize">
              {labels[day.weekday]}
            </Text>
            <Text className="text-ink-600 text-sm">
              {day.windows.length > 0 ? day.windows.join(', ') : t.hours.closed}
            </Text>
          </View>
        ))}
      </Card>
      {setup.overrides.length > 0 ? (
        <Card className="gap-2 p-4">
          <Text className="text-ink-500 text-xs font-semibold uppercase">
            {t.hours.overrides}
          </Text>
          {setup.overrides.map(override => (
            <View
              key={override.date}
              className="flex-row justify-between gap-3"
            >
              <Text className="text-ink-800 text-sm">{override.date}</Text>
              <Text className="text-ink-600 text-sm">
                {override.windows.length > 0
                  ? weeklyByDay(
                      override.windows.map(window => ({
                        ...window,
                        weekday: 1,
                      })),
                    )[0]!.windows.join(', ')
                  : t.hours.closedAllDay}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}
      <WebHint t={t} />
    </View>
  )
}

function TrialButton({ t }: { t: HostCopy }) {
  const trial = useBookingTrial()
  const start = useStartBookingTrial()
  if (trial.data?.endsAt) {
    return <Text className="text-[12.5px] text-white/80">{t.trialEnded}</Text>
  }
  if (!trial.data?.available) {
    return null
  }
  return (
    <View className="gap-1">
      <Pressable
        accessibilityRole="button"
        disabled={start.isPending}
        onPress={() => start.mutate()}
        className="h-10 justify-center self-start rounded-full border border-white/60 px-5"
      >
        <Text className="text-sm font-semibold text-white">{t.trialCta}</Text>
      </Pressable>
      {start.isError ? (
        <Text className="text-[12.5px] text-white">{t.failed}</Text>
      ) : null}
    </View>
  )
}

function Upsell({ t }: { t: HostCopy }) {
  const router = useRouter()
  const checkout = useWebCheckout()
  return (
    <View className="bg-brand-600 gap-3 rounded-2xl p-6">
      <Text className="text-[11px] font-semibold uppercase text-white">
        {t.upsellBadge}
      </Text>
      <Text className="text-[19px] font-bold text-white">{t.upsellTitle}</Text>
      <Text className="text-[13.5px] text-white/85">{t.upsellBody}</Text>
      {checkout.allowed ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/billing')}
          className="h-10 justify-center self-start rounded-full bg-white px-5"
        >
          <Text className="text-brand-700 text-sm font-semibold">
            {t.upsellCta}
          </Text>
        </Pressable>
      ) : null}
      <TrialButton t={t} />
    </View>
  )
}

export default function BookingScreen() {
  const { messages, locale } = useI18n()
  const t = messages.bookingHost
  const session = useSession()
  const entitled = session.data?.entitlements?.includes('booking') ?? false
  const setup = useBookingSetup(entitled)
  const [panel, setPanel] = useState<Panel>('bookings')

  if (!entitled) {
    return (
      <Screen>
        <Upsell t={t} />
      </Screen>
    )
  }
  if (setup.isPending) {
    return (
      <Screen>
        <Skeleton className="h-48 w-full rounded-2xl" />
      </Screen>
    )
  }
  if (setup.isError) {
    return (
      <Screen>
        <Card className="items-center gap-3 py-8">
          <Text className="text-ink-500 text-sm">{messages.common.error}</Text>
          <Button onPress={() => setup.refetch()}>
            {messages.common.retry}
          </Button>
        </Card>
      </Screen>
    )
  }
  const page = setup.data.page
  if (!page) {
    return (
      <Screen>
        <Card className="gap-3 p-6">
          <Text className="text-ink-900 text-[17px] font-bold">
            {t.wizard.title}
          </Text>
          <Text className="text-ink-500 text-sm">{t.mobile.setupHint}</Text>
          <Button className="self-start" onPress={openWeb}>
            {t.mobile.openWeb}
          </Button>
        </Card>
      </Screen>
    )
  }

  return (
    <Screen>
      <View className="gap-4">
        <LinkCard page={page} t={t} />
        <Tabs
          value={panel}
          onChange={value => setPanel(value as Panel)}
          tabs={[
            { value: 'bookings', label: t.tabs.bookings },
            { value: 'services', label: t.tabs.services },
            { value: 'hours', label: t.tabs.hours },
          ]}
        />
        {panel === 'bookings' ? (
          <BookingsList timeZone={page.timezone} />
        ) : null}
        {panel === 'services' ? (
          <ServicesView setup={setup.data} messages={messages} />
        ) : null}
        {panel === 'hours' ? (
          <HoursView setup={setup.data} t={t} locale={locale} />
        ) : null}
      </View>
    </Screen>
  )
}
