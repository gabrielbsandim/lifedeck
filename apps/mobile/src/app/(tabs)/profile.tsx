// RN port of the MobileHub half of
// apps/web/src/components/settings/settings-experience.tsx: the profile card,
// the plan teaser, and the grouped rows that drill into settings sections and
// the secondary tool screens.
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { AuthDialog } from '@/components/auth-dialog'
import {
  CalendarIcon,
  ChartIcon,
  CheckSquareIcon,
  ChevronRightIcon,
  CodeIcon,
  DeckGlyph,
  LinkIcon,
  LockIcon,
  RecurringIcon,
  SlidersIcon,
  UserIcon,
} from '@/components/icons'
import { Avatar, Button, Card, Row, Screen } from '@/components/ui'
import {
  availableSections,
  type SectionKey,
} from '@/components/settings/settings-sections'
import { planName } from '@/lib/billing/plan-display'
import { useSession } from '@/lib/api/use-session'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useThemeColors } from '@/theme/tokens'

function Group({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <View className="gap-2">
      <Text className="text-ink-500 px-1 text-xs font-semibold uppercase">
        {title}
      </Text>
      <Card className="overflow-hidden p-0">{children}</Card>
    </View>
  )
}

export default function ProfileScreen() {
  const { messages } = useI18n()
  const colors = useThemeColors()
  const router = useRouter()
  const session = useSession()
  const user = session.data
  const [authOpen, setAuthOpen] = useState(false)

  if (!user) {
    return <Screen />
  }

  if (user.isGuest || user.email === null) {
    return (
      <Screen>
        <Text className="text-ink-900 text-2xl font-bold">
          {messages.settings.title}
        </Text>
        <Text className="text-ink-500 text-sm">
          {messages.auth.createAccountSubtitle}
        </Text>
        <Button className="self-start" onPress={() => setAuthOpen(true)}>
          {messages.auth.createAccount}
        </Button>
        <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
      </Screen>
    )
  }

  const sections = availableSections(user, messages)
  const plan = user.plan ?? 'free'
  const isFree = plan === 'free'
  const planLabel = planName(plan, messages)
  const hasBilling = Boolean(user.features?.billing)
  const configKeys: SectionKey[] = ['conexoes', 'preferencias', 'seguranca']
  const configSections = sections.filter(s => configKeys.includes(s.key))

  const open = (section: SectionKey) =>
    router.push({ pathname: '/settings', params: { section } })

  return (
    <Screen>
      <Text className="text-ink-900 text-[28px] font-bold">
        {messages.settings.profile}
      </Text>

      <Pressable accessibilityRole="button" onPress={() => open('perfil')}>
        <Card className="flex-row items-center gap-3 p-3.5">
          <Avatar name={user.displayName} src={user.avatarUrl} size="md" />
          <View className="min-w-0 flex-1 gap-0.5">
            <Text className="text-ink-900 text-base font-semibold">
              {user.displayName}
            </Text>
            <Text className="text-ink-500 text-[13px]" numberOfLines={1}>
              {user.email}
            </Text>
            {user.isEmailVerified ? (
              <View className="flex-row items-center gap-1.5">
                <View className="bg-success h-1.5 w-1.5 rounded-full" />
                <Text className="text-success text-xs font-medium">
                  {messages.auth.verified}
                </Text>
              </View>
            ) : null}
          </View>
          <ChevronRightIcon size={16} color={colors.ink['300']} />
        </Card>
      </Pressable>

      {hasBilling ? (
        isFree ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/billing')}
            className="bg-brand-600 gap-2 rounded-2xl p-4"
          >
            <Text className="text-[11px] font-bold text-white/70">
              {messages.settings.planWord.toUpperCase()}{' '}
              {planLabel.toUpperCase()}
            </Text>
            <Text className="text-[13px] text-white/90">
              {messages.settings.teaserFree}
            </Text>
            <View className="mt-1 self-start rounded-full bg-white px-4 py-1.5">
              <Text className="text-brand-700 text-[13px] font-semibold">
                {messages.billing.seePlans}
              </Text>
            </View>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => open('plano')}>
            <Card className="flex-row items-center gap-3 p-3.5">
              <View className="bg-brand-600 h-10 w-10 items-center justify-center rounded-xl">
                <DeckGlyph size={22} color="#ffffff" />
              </View>
              <View className="min-w-0 flex-1 gap-0.5">
                <Text className="text-ink-900 text-[15px] font-semibold">
                  {messages.settings.planWord} {planLabel}
                </Text>
                <Text className="text-ink-500 text-[13px]">
                  {messages.settings.teaserPaid}
                </Text>
              </View>
              <ChevronRightIcon size={16} color={colors.ink['300']} />
            </Card>
          </Pressable>
        )
      ) : null}

      <Group title={messages.settings.hubConfig}>
        {configSections.map(section => (
          <Row
            key={section.key}
            label={section.label}
            icon={
              section.key === 'conexoes' ? (
                <LinkIcon size={16} color={colors.brand.accent} />
              ) : section.key === 'preferencias' ? (
                <SlidersIcon size={16} color={colors.ink['500']} />
              ) : (
                <LockIcon size={15} color={colors.warning} />
              )
            }
            onPress={() => open(section.key)}
          />
        ))}
      </Group>

      <Group title={messages.settings.hubTools}>
        {user.features?.calendar ? (
          <Row
            label={messages.nav.calendar}
            icon={<CalendarIcon size={16} color={colors.brand['500']} />}
            onPress={() => router.push('/calendar')}
          />
        ) : null}
        <Row
          label={messages.nav.analytics}
          icon={<ChartIcon size={16} color={colors.violet['500']} />}
          onPress={() => router.push('/analytics')}
        />
        <Row
          label={messages.recurring.manage}
          icon={<RecurringIcon size={16} color={colors.success} />}
          onPress={() => router.push('/recurring')}
        />
        <Row
          label={messages.habits.manage}
          icon={<CheckSquareIcon size={16} color={colors.brand['600']} />}
          onPress={() => router.push('/habits')}
        />
        <Row
          label={messages.nav.developers}
          icon={<CodeIcon size={16} color={colors.tileStrong} />}
          onPress={() => router.push('/developers')}
        />
      </Group>

      <Group title={messages.settings.hubAccount}>
        <Row
          label={messages.settings.account}
          icon={<UserIcon size={16} color={colors.ink['500']} />}
          onPress={() => open('conta')}
        />
      </Group>
    </Screen>
  )
}
