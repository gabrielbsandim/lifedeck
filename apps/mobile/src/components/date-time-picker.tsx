// Thin wrappers over the platform date/time picker, kept in one place because
// its API differs by OS: Android shows a one-shot dialog, iOS an inline
// spinner that stays mounted. Values are exchanged as the same ISO strings the
// web's <input type="date"> / <input type="time"> use.
import { useState } from 'react'
import { Platform, Pressable, Text, View } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { CalendarIcon, ClockIcon } from '@/components/icons'
import { cn } from '@/lib/cn'
import { useThemeColors } from '@/theme/tokens'

function parseIsoDate(value: string): Date {
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export type DateFieldProps = {
  label?: string
  value: string
  onChange: (value: string) => void
  display?: string
  className?: string
  /**
   * Starts with the picker already showing. For callers whose own control
   * opened the field, so the user does not have to tap twice.
   */
  defaultOpen?: boolean
  /** Fires when the picker closes, opened or dismissed. */
  onDismiss?: () => void
}

export function DateField({
  label,
  value,
  onChange,
  display,
  className,
  defaultOpen = false,
  onDismiss,
}: DateFieldProps) {
  const colors = useThemeColors()
  const [open, setOpen] = useState(defaultOpen)

  function close() {
    setOpen(false)
    onDismiss?.()
  }

  return (
    <View className={cn('gap-1.5', className)}>
      {label ? (
        <Text className="text-ink-700 text-sm font-medium">{label}</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        className="border-line bg-surface h-11 flex-row items-center gap-2 rounded-xl border-[1.5px] px-3.5"
      >
        <CalendarIcon size={16} color={colors.ink['400']} />
        <Text className="text-ink-800 flex-1 text-base">
          {display ?? value}
        </Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          mode="date"
          value={parseIsoDate(value)}
          onChange={(event, selected) => {
            // Android fires once and dismisses itself; iOS keeps the spinner up
            // until the field is tapped away, so only Android closes here.
            if (Platform.OS !== 'ios') {
              close()
            }
            if (event.type !== 'dismissed' && selected) {
              onChange(toIsoDate(selected))
            }
          }}
        />
      ) : null}
      {open && Platform.OS === 'ios' ? (
        <Pressable accessibilityRole="button" onPress={close}>
          <Text className="text-brand-accent text-center text-sm font-semibold">
            OK
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}

export type TimeFieldProps = {
  label?: string
  /** "HH:MM" in 24h, matching <input type="time">. */
  value: string
  onChange: (value: string) => void
  className?: string
}

export function TimeField({
  label,
  value,
  onChange,
  className,
}: TimeFieldProps) {
  const colors = useThemeColors()
  const [open, setOpen] = useState(false)

  const [hours = '9', minutes = '0'] = value.split(':')
  const asDate = new Date()
  asDate.setHours(Number(hours), Number(minutes), 0, 0)

  return (
    <View className={cn('gap-1.5', className)}>
      {label ? (
        <Text className="text-ink-700 text-sm font-medium">{label}</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        className="border-line bg-surface h-11 flex-row items-center gap-2 rounded-xl border-[1.5px] px-3.5"
      >
        <ClockIcon size={16} color={colors.ink['400']} />
        <Text className="text-ink-800 flex-1 text-base">{value}</Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          mode="time"
          is24Hour
          value={asDate}
          onChange={(event, selected) => {
            if (Platform.OS !== 'ios') {
              setOpen(false)
            }
            if (event.type !== 'dismissed' && selected) {
              const hh = String(selected.getHours()).padStart(2, '0')
              const mm = String(selected.getMinutes()).padStart(2, '0')
              onChange(`${hh}:${mm}`)
            }
          }}
        />
      ) : null}
      {open && Platform.OS === 'ios' ? (
        <Pressable accessibilityRole="button" onPress={() => setOpen(false)}>
          <Text className="text-brand-accent text-center text-sm font-semibold">
            OK
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}
