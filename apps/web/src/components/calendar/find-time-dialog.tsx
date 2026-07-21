'use client'

import { useState } from 'react'
import { Button, cn, Dialog } from '@lifedeck/ui'
import type { FreeSlotView } from '@lifedeck/application'
import { useI18n } from '@/lib/i18n/messages-provider'
import type { CalendarRange } from '@/lib/calendar/calendar-view'
import { useFindTime } from '@/lib/api/use-find-time'
import { useCreateCalendarEvent } from '@/lib/api/use-calendar-events'

const DURATION_OPTIONS = [30, 60, 90, 120]
const WINDOW_DAYS = 7

type Props = {
  open: boolean
  onClose: () => void
  range: CalendarRange
  timeZone: string
  locale: string
}

export function FindTimeDialog({
  open,
  onClose,
  range,
  timeZone,
  locale,
}: Props) {
  const { messages } = useI18n()
  const t = messages.calendar.findTime

  const [durationMin, setDurationMin] = useState(60)
  const findTime = useFindTime()
  const book = useCreateCalendarEvent(range)
  const slots: FreeSlotView[] = findTime.data ?? []

  const formatSlot = (iso: string): string =>
    new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
    }).format(new Date(iso))

  function search() {
    const now = new Date()
    const to = new Date(now.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000)
    findTime.mutate({
      durationMin,
      from: now.toISOString(),
      to: to.toISOString(),
    })
  }

  function bookSlot(slot: FreeSlotView) {
    book.mutate(
      {
        title: t.defaultTitle,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        reminders: [10],
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open={open} onClose={onClose} title={t.title} variant="sheet">
      <div className="flex flex-col gap-4">
        <p className="text-ink-500 text-sm leading-relaxed">{t.hint}</p>

        <div className="flex flex-col gap-1.5">
          <span className="text-ink-700 text-sm font-medium">{t.duration}</span>
          <div className="flex flex-wrap gap-2">
            {DURATION_OPTIONS.map(option => {
              const active = option === durationMin
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setDurationMin(option)}
                  className={cn(
                    'h-10 rounded-xl border px-4 text-sm font-semibold transition',
                    active
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-line text-ink-700 bg-white',
                  )}
                >
                  {t.minutes.replace('{count}', String(option))}
                </button>
              )
            })}
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          disabled={findTime.isPending}
          onClick={search}
        >
          {findTime.isPending ? t.searching : t.search}
        </Button>

        {findTime.isError && <p className="text-sm text-red-600">{t.error}</p>}

        {findTime.isSuccess && slots.length === 0 && (
          <p className="text-ink-500 text-sm">{t.noResults}</p>
        )}

        {slots.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-ink-700 text-sm font-medium">
              {t.results}
            </span>
            <ul className="flex flex-col gap-2">
              {slots.map(slot => (
                <li
                  key={slot.startsAt}
                  className="border-line flex items-center justify-between gap-3 rounded-xl border bg-white px-3.5 py-2.5"
                >
                  <span className="text-ink-800 text-sm capitalize">
                    {formatSlot(slot.startsAt)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={book.isPending}
                    onClick={() => bookSlot(slot)}
                  >
                    {book.isPending ? t.booking : t.book}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Dialog>
  )
}
