// Mobile tab bar mirroring the web mobile-tab-bar: Today, Lists, Generate,
// Profile. Secondary routes (habits, recurring, calendar, analytics,
// developers) will hang off the Profile hub, same as the web.
import { Tabs } from 'expo-router'
import { useI18n } from '@/lib/i18n/messages-provider'
import { colors } from '@/theme/tokens'

export default function TabsLayout() {
  const { messages } = useI18n()
  const t = messages.nav

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand['600'],
        tabBarInactiveTintColor: colors.ink['400'],
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.ink['900'] },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.today }} />
      <Tabs.Screen name="lists" options={{ title: t.lists }} />
      <Tabs.Screen name="generate" options={{ title: t.generate }} />
      <Tabs.Screen name="profile" options={{ title: t.profile }} />
    </Tabs>
  )
}
