// Mobile tab bar mirroring the web mobile-tab-bar: Today, Lists, Assistant
// (raised center action), Profile. Secondary routes (habits, recurring,
// calendar, analytics, developers) hang off the Profile hub, same as the web.
import { View } from 'react-native'
import { Tabs } from 'expo-router'
import {
  CalendarIcon,
  ListsIcon,
  SparkleIcon,
  UserIcon,
} from '@/components/icons'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useThemeColors } from '@/theme/tokens'

export default function TabsLayout() {
  const { messages } = useI18n()
  const colors = useThemeColors()
  const t = messages.nav

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand.accent,
        tabBarInactiveTintColor: colors.ink['400'],
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.ink['900'] },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.today,
          headerShown: false,
          tabBarIcon: ({ color }) => <CalendarIcon size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="lists"
        options={{
          title: t.lists,
          tabBarIcon: ({ color }) => <ListsIcon size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: t.generate,
          headerShown: false,
          // The web raises this tab into a gradient pill; the same treatment
          // reads as the primary action here too.
          tabBarIcon: () => (
            <View className="bg-brand-600 h-[38px] w-[38px] items-center justify-center rounded-full">
              <SparkleIcon size={20} color="#ffffff" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.profile,
          headerShown: false,
          tabBarIcon: ({ color }) => <UserIcon size={22} color={color} />,
        }}
      />
    </Tabs>
  )
}
