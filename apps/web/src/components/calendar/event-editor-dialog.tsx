'use client'

import { useState, type FormEvent } from 'react'
import { Button, Dialog, TextField } from '@lifedeck/ui'
import type { CalendarEventView } from '@lifedeck/application'
import { useI18n } from '@/lib/i18n/messages-provider'
import type { CalendarRange } from '@/lib/calendar/calendar-view'
import {
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  useDeleteCalendarOccurrence,
  useUpdateCalendarEvent,
  useUpdateCalendarOccurrence,
} from '@/lib/api/use-calendar-events'

type EditScope = 'this' | 'all'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function isoToLocalInput(iso: string): string {
  const date = new Date(iso)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// All-day events are date-only (stored at UTC midnight); show the UTC date so
// the timezone never shifts them a day, mirroring how the grid places them.
function isoToInput(iso: string, allDay: boolean): string {
  return allDay ? `${iso.slice(0, 10)}T00:00` : isoToLocalInput(iso)
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

type Props = {
  open: boolean
  onClose: () => void
  range: CalendarRange
  event: CalendarEventView | null
  defaultDay: string
}

export function EventEditorDialog({
  open,
  onClose,
  range,
  event,
  defaultDay,
}: Props) {
  const { messages } = useI18n()
  const t = messages.calendar

  const [title, setTitle] = useState(event?.title ?? '')
  const [location, setLocation] = useState(event?.location ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [allDay, setAllDay] = useState(event?.allDay ?? false)
  const [reminders, setReminders] = useState<number[]>(event?.reminders ?? [])
  const [startsAt, setStartsAt] = useState(
    event ? isoToInput(event.startsAt, event.allDay) : `${defaultDay}T09:00`,
  )
  const [endsAt, setEndsAt] = useState(
    event ? isoToInput(event.endsAt, event.allDay) : `${defaultDay}T10:00`,
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

  function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault()
    const input = {
      title: title.trim(),
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label={t.title}
          value={title}
          onChange={changed => setTitle(changed.target.value)}
          maxLength={200}
          autoFocus
          required
        />

        <label className="text-ink-700 flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={allDay}
            onChange={changed => setAllDay(changed.target.checked)}
            className="accent-brand-600 h-4 w-4"
          />
          {t.allDay}
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-ink-700 text-sm font-medium">
              {t.startsAt}
            </span>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={changed => setStartsAt(changed.target.value)}
              className="border-line text-ink-800 focus-visible:border-brand-600 h-11 rounded-xl border-[1.5px] bg-white px-3.5 text-sm outline-none"
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-ink-700 text-sm font-medium">{t.endsAt}</span>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={changed => setEndsAt(changed.target.value)}
              className="border-line text-ink-800 focus-visible:border-brand-600 h-11 rounded-xl border-[1.5px] bg-white px-3.5 text-sm outline-none"
              required
            />
          </label>
        </div>

        <TextField
          label={t.location}
          value={location}
          onChange={changed => setLocation(changed.target.value)}
          maxLength={300}
        />

        <label className="flex flex-col gap-1.5">
          <span className="text-ink-700 text-sm font-medium">
            {t.description}
          </span>
          <textarea
            value={description}
            onChange={changed => setDescription(changed.target.value)}
            maxLength={2000}
            rows={3}
            className="border-line text-ink-800 focus-visible:border-brand-600 rounded-xl border-[1.5px] bg-white px-3.5 py-2.5 text-sm outline-none"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-ink-700 text-sm font-medium">
            {t.reminders}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {REMINDER_OPTIONS.map(minutes => {
              const active = reminders.includes(minutes)
              return (
                <button
                  key={minutes}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setReminders(current =>
                      active
                        ? current.filter(value => value !== minutes)
                        : [...current, minutes],
                    )
                  }
                  className={
                    active
                      ? 'bg-brand-50 text-brand-700 rounded-full px-3 py-1 text-xs font-semibold'
                      : 'border-line text-ink-600 hover:bg-bg rounded-full border px-3 py-1 text-xs font-medium'
                  }
                >
                  {reminderLabel(minutes, t.atStart)}
                </button>
              )
            })}
          </div>
        </div>

        {isRecurring && (
          <div className="flex flex-col gap-1.5">
            <span className="text-ink-700 text-sm font-medium">
              {t.applyTo}
            </span>
            <div className="border-line flex gap-1 rounded-xl border p-1">
              {(['this', 'all'] as const).map(option => {
                const active = scope === option
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setScope(option)}
                    className={
                      active
                        ? 'bg-brand-600 flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white'
                        : 'text-ink-600 hover:bg-bg flex-1 rounded-lg px-3 py-1.5 text-xs font-medium'
                    }
                  >
                    {option === 'this' ? t.thisEvent : t.allEvents}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-1 flex items-center gap-2">
          <Button
            type="submit"
            isLoading={
              create.isPending || update.isPending || updateOccurrence.isPending
            }
            disabled={!title.trim() || pending}
            className="flex-1"
          >
            {t.save}
          </Button>
          {event && (isRecurring || !isGoogle) && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              isLoading={remove.isPending || removeOccurrence.isPending}
              disabled={pending}
              className="text-danger hover:bg-danger/5"
            >
              {t.delete}
            </Button>
          )}
        </div>
      </form>
    </Dialog>
  )
}
