// RN port of apps/web/src/components/calendar/event-editor-dialog.tsx. The
// datetime-local inputs become a date field plus a time field per bound; every
// mutation path (plain event, occurrence, series) is the web's.
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import type { CalendarEventView } from '@lifedeck/application'
import { DateField, TimeField } from '@/components/date-time-picker'
import { Button, Dialog, Switch, TextField } from '@/components/ui'
import type { CalendarRange } from '@/lib/calendar/calendar-view'
import {
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  useDeleteCalendarOccurrence,
  useUpdateCalendarEvent,
  useUpdateCalendarOccurrence,
} from '@/lib/api/use-calendar-events'
import { useI18n } from '@/lib/i18n/messages-provider'
import { cn } from '@/lib/cn'
import { useThemeColors } from '@/theme/tokens'

type EditScope = 'this' | 'all'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

type Moment = { date: string; time: string }

function localMoment(iso: string): Moment {
  const date = new Date(iso)
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  }
}

// All-day events are date-only (stored at UTC midnight); show the UTC date so
// the timezone never shifts them a day, mirroring how the grid places them.
function toMoment(iso: string, allDay: boolean): Moment {
  return allDay ? { date: iso.slice(0, 10), time: '00:00' } : localMoment(iso)
}

function momentToIso(moment: Moment): string {
  return new Date(`${moment.date}T${moment.time}`).toISOString()
}

const REMINDER_OPTIONS = [0, 10, 30, 60, 1440]

function reminderLabel(minutes: number, atStart: string): string {
  if (minutes === 0) {
    return atStart
  }
  if (minutes < 60) {
    return `${minutes}m`
  }
  if (minutes < 1440) {
    return `${minutes / 60}h`
  }
  return `${minutes / 1440}d`
}

export function EventEditorDialog({
  open,
  onClose,
  range,
  event,
  defaultDay,
}: {
  open: boolean
  onClose: () => void
  range: CalendarRange
  event: CalendarEventView | null
  defaultDay: string
}) {
  const { messages } = useI18n()
  const colors = useThemeColors()
  const t = messages.calendar

  const [title, setTitle] = useState(event?.title ?? '')
  const [location, setLocation] = useState(event?.location ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [allDay, setAllDay] = useState(event?.allDay ?? false)
  const [reminders, setReminders] = useState<number[]>(event?.reminders ?? [])
  const [starts, setStarts] = useState<Moment>(
    event
      ? toMoment(event.startsAt, event.allDay)
      : { date: defaultDay, time: '09:00' },
  )
  const [ends, setEnds] = useState<Moment>(
    event
      ? toMoment(event.endsAt, event.allDay)
      : { date: defaultDay, time: '10:00' },
  )

  const create = useCreateCalendarEvent(range)
  const update = useUpdateCalendarEvent(range)
  const remove = useDeleteCalendarEvent(range)
  const updateOccurrence = useUpdateCalendarOccurrence(range)
  const removeOccurrence = useDeleteCalendarOccurrence(range)
  const isGoogle = event?.source === 'google'
  const isRecurring = event?.recurring === true
  const [scope, setScope] = useState<EditScope>('this')
  // The series master is the target for "all events"; fall back to the event's
  // own id for a plain event.
  const seriesId = event?.seriesId ?? event?.id ?? ''
  const pending =
    create.isPending ||
    update.isPending ||
    remove.isPending ||
    updateOccurrence.isPending ||
    removeOccurrence.isPending

  function handleSubmit() {
    const input = {
      title: title.trim(),
      startsAt: momentToIso(starts),
      endsAt: momentToIso(ends),
      allDay,
      reminders: [...reminders].sort((a, b) => a - b),
      location: location.trim() || null,
      description: description.trim() || null,
    }
    if (!event) {
      create.mutate(input, { onSuccess: onClose })
      return
    }
    if (isRecurring && scope === 'this' && event.occurrenceStart) {
      updateOccurrence.mutate(
        {
          seriesId,
          input: { ...input, occurrenceStart: event.occurrenceStart },
        },
        { onSuccess: onClose },
      )
      return
    }
    update.mutate(
      { id: isRecurring ? seriesId : event.id, input },
      { onSuccess: onClose },
    )
  }

  function handleDelete() {
    if (!event) {
      return
    }
    if (isRecurring && scope === 'this' && event.occurrenceStart) {
      removeOccurrence.mutate(
        { seriesId, occurrenceStart: event.occurrenceStart },
        { onSuccess: onClose },
      )
      return
    }
    remove.mutate(isRecurring ? seriesId : event.id, { onSuccess: onClose })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={event ? t.editEvent : t.newEvent}
      variant="sheet"
    >
      <View className="gap-4">
        <TextField
          label={t.title}
          value={title}
          onChangeText={setTitle}
          maxLength={200}
          autoFocus
        />

        <View className="border-line min-h-[52px] flex-row items-center gap-3 rounded-xl border px-4">
          <Text className="text-ink-700 flex-1 text-sm font-medium">
            {t.allDay}
          </Text>
          <Switch
            value={allDay}
            onValueChange={setAllDay}
            accessibilityLabel={t.allDay}
          />
        </View>

        <View className="gap-3">
          <Text className="text-ink-700 text-sm font-medium">{t.startsAt}</Text>
          <View className="flex-row gap-2">
            <DateField
              className="flex-1"
              value={starts.date}
              onChange={date => setStarts({ ...starts, date })}
            />
            {!allDay ? (
              <TimeField
                className="w-32"
                value={starts.time}
                onChange={time => setStarts({ ...starts, time })}
              />
            ) : null}
          </View>

          <Text className="text-ink-700 text-sm font-medium">{t.endsAt}</Text>
          <View className="flex-row gap-2">
            <DateField
              className="flex-1"
              value={ends.date}
              onChange={date => setEnds({ ...ends, date })}
            />
            {!allDay ? (
              <TimeField
                className="w-32"
                value={ends.time}
                onChange={time => setEnds({ ...ends, time })}
              />
            ) : null}
          </View>
        </View>

        <TextField
          label={t.location}
          value={location}
          onChangeText={setLocation}
          maxLength={300}
        />

        <View className="gap-1.5">
          <Text className="text-ink-700 text-sm font-medium">
            {t.description}
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            maxLength={2000}
            multiline
            numberOfLines={3}
            placeholderTextColor={colors.ink['400']}
            className="border-line text-ink-800 bg-surface min-h-[76px] rounded-xl border-[1.5px] px-3.5 py-2.5 text-sm"
          />
        </View>

        <View className="gap-1.5">
          <Text className="text-ink-700 text-sm font-medium">
            {t.reminders}
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {REMINDER_OPTIONS.map(minutes => {
              const active = reminders.includes(minutes)
              return (
                <Pressable
                  key={minutes}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() =>
                    setReminders(current =>
                      active
                        ? current.filter(value => value !== minutes)
                        : [...current, minutes],
                    )
                  }
                  className={cn(
                    'rounded-full px-3 py-1',
                    active ? 'bg-brand-50' : 'border-line border',
                  )}
                >
                  <Text
                    className={cn(
                      'text-xs font-semibold',
                      active ? 'text-brand-accent-strong' : 'text-ink-600',
                    )}
                  >
                    {reminderLabel(minutes, t.atStart)}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        {isRecurring ? (
          <View className="gap-1.5">
            <Text className="text-ink-700 text-sm font-medium">
              {t.applyTo}
            </Text>
            <View className="border-line flex-row gap-1 rounded-xl border p-1">
              {(['this', 'all'] as const).map(option => {
                const active = scope === option
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setScope(option)}
                    className={cn(
                      'flex-1 items-center rounded-lg px-3 py-1.5',
                      active && 'bg-brand-600',
                    )}
                  >
                    <Text
                      className={cn(
                        'text-xs font-semibold',
                        active ? 'text-white' : 'text-ink-600',
                      )}
                    >
                      {option === 'this' ? t.thisEvent : t.allEvents}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        ) : null}

        <View className="mt-1 flex-row items-center gap-2">
          <Button
            className="flex-1"
            isLoading={
              create.isPending || update.isPending || updateOccurrence.isPending
            }
            disabled={!title.trim() || pending}
            onPress={handleSubmit}
          >
            {t.save}
          </Button>
          {event && (isRecurring || !isGoogle) ? (
            <Button
              variant="ghost"
              onPress={handleDelete}
              isLoading={remove.isPending || removeOccurrence.isPending}
              disabled={pending}
            >
              <Text className="text-danger text-sm font-semibold">
                {t.delete}
              </Text>
            </Button>
          ) : null}
        </View>
      </View>
    </Dialog>
  )
}
