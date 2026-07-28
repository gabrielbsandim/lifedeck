// RN port of the ActionCard section of apps/web/src/components/assistant-chat.tsx:
// the receipt the chat shows for each tool the assistant ran.
import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  FlameIcon,
  ListsIcon,
  SparkleIcon,
} from '@/components/icons'
import type { AssistantAction } from '@/lib/api/use-assistant'
import type { Messages } from '@lifedeck/i18n'
import { cn } from '@/lib/cn'
import { useThemeColors, type ThemeColors } from '@/theme/tokens'

const BCP47: Record<string, string> = {
  en: 'en-US',
  pt: 'pt-BR',
  es: 'es-ES',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function formatWhen(iso: string | null, locale: string): string | null {
  if (!iso) {
    return null
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return new Intl.DateTimeFormat(BCP47[locale] ?? locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatSlot(
  start: string | null,
  end: string | null,
  locale: string,
): string {
  const startLabel = formatWhen(start, locale)
  if (!startLabel) {
    return ''
  }
  if (!end) {
    return startLabel
  }
  const endDate = new Date(end)
  if (Number.isNaN(endDate.getTime())) {
    return startLabel
  }
  const endTime = new Intl.DateTimeFormat(BCP47[locale] ?? locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(endDate)
  return `${startLabel} – ${endTime}`
}

function cadenceLabel(cadence: unknown, messages: Messages): string | null {
  if (!isRecord(cadence)) {
    return null
  }
  if (cadence.kind === 'daily') {
    return messages.habits.daily
  }
  if (cadence.kind === 'weekdays') {
    return messages.habits.weekdays
  }
  if (cadence.kind === 'times_per_week' && typeof cadence.count === 'number') {
    return `${cadence.count} ${messages.habits.timesPerWeekUnit}`
  }
  return null
}

type Tint = 'success' | 'brand' | 'warning' | 'violet'

function tintColor(tint: Tint, colors: ThemeColors): string {
  if (tint === 'success') return colors.success
  if (tint === 'brand') return colors.brand.accent
  if (tint === 'warning') return colors.warning
  return colors.violet['500']
}

const TINT_BG: Record<Tint, string> = {
  success: 'bg-success/15',
  brand: 'bg-brand-100',
  warning: 'bg-warning/20',
  violet: 'bg-violet-soft',
}

const TINT_TEXT: Record<Tint, string> = {
  success: 'text-success',
  brand: 'text-brand-accent',
  warning: 'text-warning',
  violet: 'text-violet-500',
}

function CardHeadline({
  label,
  title,
  subtitle,
  tint,
  icon,
}: {
  label: string
  title: string
  subtitle?: string | null
  tint: Tint
  icon: ReactNode
}) {
  return (
    <View className="flex-row items-start gap-2.5 p-3.5">
      <View
        className={cn(
          'h-[30px] w-[30px] items-center justify-center rounded-[9px]',
          TINT_BG[tint],
        )}
      >
        {icon}
      </View>
      <View className="min-w-0 flex-1">
        <Text className={cn('text-[11px] font-bold', TINT_TEXT[tint])}>
          {label}
        </Text>
        <Text className="text-ink-900 mt-0.5 text-[15px] font-semibold">
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-ink-500 mt-0.5 text-[13px]">{subtitle}</Text>
        ) : null}
      </View>
    </View>
  )
}

function CardButton({
  label,
  onPress,
}: {
  label: string
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="border-line active:bg-brand-50 h-11 items-center justify-center border-t"
    >
      <Text className="text-brand-accent text-[13.5px] font-semibold">
        {label}
      </Text>
    </Pressable>
  )
}

export function ActionCard({
  action,
  messages,
  locale,
  onOpenLists,
  onOpenToday,
}: {
  action: AssistantAction
  messages: Messages
  locale: string
  onOpenLists: () => void
  onOpenToday: () => void
}) {
  const colors = useThemeColors()
  const c = messages.assistant.cards
  const input = isRecord(action.input) ? action.input : {}
  const result = isRecord(action.result) ? action.result : {}

  const shell = (children: ReactNode) => (
    <View className="flex-row items-start gap-2.5">
      <View className="bg-brand-600 h-[30px] w-[30px] items-center justify-center rounded-full">
        <SparkleIcon size={16} color="#ffffff" />
      </View>
      <View className="border-line bg-surface min-w-0 max-w-[80%] flex-1 overflow-hidden rounded-2xl border">
        {children}
      </View>
    </View>
  )

  if (action.tool === 'addTask') {
    return shell(
      <CardHeadline
        label={c.taskAdded}
        title={str(input.title) ?? ''}
        tint="success"
        icon={<CheckIcon size={17} color={tintColor('success', colors)} />}
      />,
    )
  }

  if (action.tool === 'addEvent') {
    return shell(
      <CardHeadline
        label={c.eventScheduled}
        title={str(input.title) ?? ''}
        subtitle={formatWhen(str(input.startsAt), locale)}
        tint="brand"
        icon={<CalendarIcon size={16} color={tintColor('brand', colors)} />}
      />,
    )
  }

  if (action.tool === 'addHabit') {
    return shell(
      <CardHeadline
        label={c.habitCreated}
        title={str(input.title) ?? ''}
        subtitle={cadenceLabel(input.cadence, messages)}
        tint="warning"
        icon={<FlameIcon size={16} color={tintColor('warning', colors)} />}
      />,
    )
  }

  if (action.tool === 'createList') {
    return shell(
      <>
        <CardHeadline
          label={c.listCreated}
          title={str(input.title) ?? ''}
          tint="violet"
          icon={<ListsIcon size={16} color={tintColor('violet', colors)} />}
        />
        <CardButton label={c.openList} onPress={onOpenLists} />
      </>,
    )
  }

  if (action.tool === 'getToday') {
    const tasks = Array.isArray(result.tasks) ? result.tasks : []
    return shell(
      <>
        <View className="px-3.5 pt-3.5">
          <Text className="text-brand-accent-strong text-[11px] font-bold">
            {c.today}
          </Text>
        </View>
        <View className="px-3.5 pb-1.5 pt-1">
          {tasks.length === 0 ? (
            <Text className="text-ink-500 py-1 text-[13px]">{c.noEvents}</Text>
          ) : (
            tasks.map((task, index) => {
              const item = isRecord(task) ? task : {}
              const done = item.status === 'done' || item.status === 'completed'
              return (
                <View
                  key={index}
                  className="flex-row items-center gap-2.5 py-1"
                >
                  <View
                    className={cn(
                      'h-[18px] w-[18px] items-center justify-center rounded-md border-2',
                      done ? 'bg-success border-transparent' : 'border-ink-200',
                    )}
                  >
                    {done ? <CheckIcon size={10} color="#ffffff" /> : null}
                  </View>
                  <Text
                    className={cn(
                      'text-[14px]',
                      done ? 'text-ink-400 line-through' : 'text-ink-700',
                    )}
                  >
                    {str(item.title) ?? ''}
                  </Text>
                </View>
              )
            })
          )}
        </View>
        <CardButton label={c.openDay} onPress={onOpenToday} />
      </>,
    )
  }

  if (action.tool === 'getWeather') {
    if (result.ok !== true || !isRecord(result.forecast)) {
      return null
    }
    const forecast = result.forecast
    const current = isRecord(forecast.current) ? forecast.current : null
    const temp =
      current && typeof current.temperatureC === 'number'
        ? `${Math.round(current.temperatureC)}°`
        : '--'
    return shell(
      <View className="bg-brand-600 p-[18px]">
        <Text className="text-[12.5px] text-white/85">
          {str(forecast.location)}
        </Text>
        <Text className="mt-0.5 text-4xl font-extrabold text-white">
          {temp}
        </Text>
        {current ? (
          <Text className="text-[13.5px] text-white/90">
            {str(current.condition)}
          </Text>
        ) : null}
      </View>,
    )
  }

  if (action.tool === 'findTime') {
    const slots = Array.isArray(result.slots) ? result.slots : []
    const first = isRecord(slots[0]) ? slots[0] : null
    return shell(
      <View className="p-3.5">
        <View className="flex-row items-center gap-2.5">
          <View className="bg-success/15 h-[30px] w-[30px] items-center justify-center rounded-[9px]">
            <ClockIcon size={16} color={colors.success} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-success text-[11px] font-bold">
              {c.freeSlot}
            </Text>
            <Text className="text-ink-900 mt-0.5 text-[15px] font-semibold">
              {first
                ? formatSlot(str(first.startsAt), str(first.endsAt), locale)
                : ''}
            </Text>
          </View>
        </View>
      </View>,
    )
  }

  return null
}
