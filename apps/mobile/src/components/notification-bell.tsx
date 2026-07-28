// RN port of apps/web/src/components/notification-bell.tsx. Same `describe`
// mapping and relative timestamps; the web's absolutely-positioned popover
// becomes a bottom sheet, which is the native equivalent.
import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import type { NotificationView } from '@lifedeck/application'
import { BellIcon, CalendarIcon, CheckIcon } from '@/components/icons'
import { Dialog } from '@/components/ui'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/lib/api/use-notifications'
import { useSession } from '@/lib/api/use-session'
import { useI18n } from '@/lib/i18n/messages-provider'
import { cn } from '@/lib/cn'
import { useThemeColors } from '@/theme/tokens'

const BCP47: Record<string, string> = {
  en: 'en-US',
  pt: 'pt-BR',
  es: 'es-ES',
}

type Rendered = { title: string; subtitle?: string }

type NotificationMessages = ReturnType<
  typeof useI18n
>['messages']['notifications']

// Turns a stored notification into human text. The reminder carries the event's
// title and start time in `data`, so the bell reads "Reminder: Dentist" with the
// day and time underneath instead of the raw "event-reminder" type.
function describe(
  notification: NotificationView,
  t: NotificationMessages,
  locale: string,
  timeZone?: string,
): Rendered {
  const data = notification.data
  if (notification.type === 'event-reminder') {
    return {
      title: t.reminder.replace('{event}', data.title ?? ''),
      subtitle: formatEventTime(data.startsAt, locale, timeZone),
    }
  }
  if (notification.type === 'task-assigned') {
    return {
      title: t.assigned.replace('{task}', data.taskTitle ?? ''),
      subtitle: data.listTitle,
    }
  }
  // Proactive assistant messages that WhatsApp could not deliver (window closed,
  // no number linked). They carry the full composed text, so the bell is where
  // the user still gets their morning brief or check-in.
  if (notification.type === 'daily-brief') {
    return { title: t.dailyBrief, subtitle: data.text }
  }
  if (notification.type === 'habit-checkin') {
    return {
      title: t.habitCheckin.replace('{habit}', data.habitTitle ?? ''),
      subtitle: data.text,
    }
  }
  if (notification.type === 'nudge') {
    return {
      title: t.nudge.replace('{task}', data.taskTitle ?? ''),
      subtitle: data.text,
    }
  }
  return { title: t.generic }
}

function formatEventTime(
  iso: string | undefined,
  locale: string,
  timeZone?: string,
): string | undefined {
  if (!iso) {
    return undefined
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }
  return new Intl.DateTimeFormat(BCP47[locale] ?? locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date)
}

function relativeTime(iso: string, locale: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) {
    return ''
  }
  const diffSec = Math.round((then - Date.now()) / 1000)
  const abs = Math.abs(diffSec)
  const rtf = new Intl.RelativeTimeFormat(BCP47[locale] ?? locale, {
    numeric: 'auto',
  })
  if (abs < 60) {
    return rtf.format(diffSec, 'second')
  }
  if (abs < 3600) {
    return rtf.format(Math.round(diffSec / 60), 'minute')
  }
  if (abs < 86_400) {
    return rtf.format(Math.round(diffSec / 3600), 'hour')
  }
  return rtf.format(Math.round(diffSec / 86_400), 'day')
}

function NotificationIcon({ type }: { type: string }) {
  const colors = useThemeColors()
  if (type === 'event-reminder') {
    return (
      <View className="bg-brand-100 h-8 w-8 items-center justify-center rounded-full">
        <CalendarIcon size={16} color={colors.brand.accent} />
      </View>
    )
  }
  if (type === 'task-assigned') {
    return (
      <View className="bg-violet-soft h-8 w-8 items-center justify-center rounded-full">
        <CheckIcon size={16} color={colors.violet['500']} />
      </View>
    )
  }
  return (
    <View className="bg-line h-8 w-8 items-center justify-center rounded-full">
      <BellIcon size={16} color={colors.ink['500']} />
    </View>
  )
}

export function NotificationBell() {
  const { messages, locale } = useI18n()
  const colors = useThemeColors()
  const t = messages.notifications
  const session = useSession()
  const notifications = useNotifications()
  const markAll = useMarkAllNotificationsRead()
  const markOne = useMarkNotificationRead()
  const [open, setOpen] = useState(false)

  const items = notifications.data?.items ?? []
  const unread = notifications.data?.unread ?? 0
  const timeZone = session.data?.timezone

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.open}
        onPress={() => setOpen(true)}
        className="h-9 w-9 items-center justify-center rounded-full"
      >
        <BellIcon size={20} color={colors.ink['500']} />
        {unread > 0 ? (
          <View className="bg-danger absolute right-1 top-1 h-4 min-w-4 items-center justify-center rounded-full px-1">
            <Text className="text-[10px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t.title}
        variant="sheet"
      >
        {unread > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => markAll.mutate()}
            className="mb-2 self-end"
          >
            <Text className="text-brand-accent text-xs font-medium">
              {t.markAllRead}
            </Text>
          </Pressable>
        ) : null}

        {items.length === 0 ? (
          <Text className="text-ink-500 py-6 text-center text-sm">
            {t.empty}
          </Text>
        ) : (
          <ScrollView className="max-h-96">
            {items.map(item => {
              const rendered = describe(item, t, locale, timeZone)
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  onPress={() => !item.isRead && markOne.mutate(item.id)}
                  className={cn(
                    'border-line flex-row items-start gap-3 border-b px-2 py-3',
                    item.isRead ? 'bg-surface' : 'bg-brand-50',
                  )}
                >
                  <NotificationIcon type={item.type} />
                  <View className="min-w-0 flex-1 gap-0.5">
                    <View className="flex-row items-start justify-between gap-2">
                      <Text className="text-ink-800 flex-1 text-sm font-medium">
                        {rendered.title}
                      </Text>
                      <Text className="text-ink-400 text-[11px]">
                        {relativeTime(item.createdAt, locale)}
                      </Text>
                    </View>
                    {rendered.subtitle ? (
                      <Text className="text-ink-500 text-xs">
                        {rendered.subtitle}
                      </Text>
                    ) : null}
                  </View>
                  {!item.isRead ? (
                    <View className="bg-brand-500 mt-1.5 h-2 w-2 rounded-full" />
                  ) : null}
                </Pressable>
              )
            })}
          </ScrollView>
        )}
      </Dialog>
    </>
  )
}
