'use client'

import { useState, type FormEvent } from 'react'
import { Button, Dialog, TextField } from '@lifedeck/ui'
import type { CalendarEventView } from '@lifedeck/application'
import { useI18n } from '@/lib/i18n/messages-provider'
import type { CalendarRange } from '@/lib/calendar/calendar-view'
import {
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  useUpdateCalendarEvent,
} from '@/lib/api/use-calendar-events'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function isoToLocalInput(iso: string): string {
  const date = new Date(iso)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
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
  const [startsAt, setStartsAt] = useState(
    event ? isoToLocalInput(event.startsAt) : `${defaultDay}T09:00`,
  )
  const [endsAt, setEndsAt] = useState(
    event ? isoToLocalInput(event.endsAt) : `${defaultDay}T10:00`,
  )

  const create = useCreateCalendarEvent(range)
  const update = useUpdateCalendarEvent(range)
  const remove = useDeleteCalendarEvent(range)
  const isGoogle = event?.source === 'google'
  const pending = create.isPending || update.isPending || remove.isPending

  function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault()
    const input = {
      title: title.trim(),
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      allDay,
      location: location.trim() || null,
      description: description.trim() || null,
    }
    if (event) {
      update.mutate({ id: event.id, input }, { onSuccess: onClose })
    } else {
      create.mutate(input, { onSuccess: onClose })
    }
  }

  function handleDelete() {
    if (event) {
      remove.mutate(event.id, { onSuccess: onClose })
    }
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

        <div className="mt-1 flex items-center gap-2">
          <Button
            type="submit"
            isLoading={create.isPending || update.isPending}
            disabled={!title.trim() || pending}
            className="flex-1"
          >
            {t.save}
          </Button>
          {event && !isGoogle && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              isLoading={remove.isPending}
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
