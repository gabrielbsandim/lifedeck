'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import type { CalendarEventView } from '@lifedeck/application'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  eventCalendarLabel,
  eventColor,
} from '@/components/calendar/event-format'

type Props = {
  event: CalendarEventView
  timeZone: string
  locale: string
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

function timeRange(
  event: CalendarEventView,
  timeZone: string,
  locale: string,
  allDayLabel: string,
): string {
  if (event.allDay) {
    return allDayLabel
  }
  const format = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  })
  return `${format.format(new Date(event.startsAt))} – ${format.format(new Date(event.endsAt))}`
}

export function EventDetailSheet({
  event,
  timeZone,
  locale,
  onClose,
  onEdit,
  onDelete,
}: Props) {
  const { messages } = useI18n()
  const t = messages.calendar

  useEffect(() => {
    function onKey(key: KeyboardEvent) {
      if (key.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const dateLong = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: event.allDay ? 'UTC' : timeZone,
  }).format(new Date(event.startsAt))

  const accent = eventColor(event)

  return (
    <div
      onClick={onClose}
      className="bg-ink-900/30 fixed inset-0 z-50 flex items-end justify-center p-4 backdrop-blur-sm"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={event.title || t.untitled}
        onClick={click => click.stopPropagation()}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-md rounded-t-[24px] bg-white p-5 shadow-lg outline-none"
      >
        <div
          aria-hidden
          className="bg-line mx-auto mb-4 h-1 w-10 rounded-full"
        />

        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="min-h-[44px] w-[5px] flex-none self-stretch rounded-full"
            style={{ background: accent }}
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-ink-900 text-xl font-bold leading-tight">
              {event.title || t.untitled}
            </h3>
            <span className="text-ink-500 mt-1.5 inline-flex items-center gap-1.5 text-[13px] font-semibold">
              <span
                className="h-2 w-2 flex-none rounded-full"
                style={{ background: accent }}
              />
              {eventCalendarLabel(event, t.syncedTag, t.title)}
            </span>
          </div>
        </div>

        <div className="mt-[18px] flex flex-col gap-3.5">
          <div className="flex items-center gap-3">
            <span className="bg-bg text-ink-500 flex h-9 w-9 flex-none items-center justify-center rounded-[11px]">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </span>
            <div className="flex flex-col">
              <span className="text-ink-800 text-[15px] font-semibold capitalize">
                {dateLong}
              </span>
              <span className="text-ink-500 text-[13px] tabular-nums">
                {timeRange(event, timeZone, locale, t.allDay)}
              </span>
            </div>
          </div>

          {event.location && (
            <div className="flex items-center gap-3">
              <span className="bg-bg text-ink-500 flex h-9 w-9 flex-none items-center justify-center rounded-[11px]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <span className="text-ink-800 text-[15px]">{event.location}</span>
            </div>
          )}
        </div>

        <div className="mt-[22px] flex gap-2.5">
          <button
            type="button"
            onClick={onEdit}
            className="border-line text-ink-700 flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] border bg-white text-[15px] font-semibold"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
            </svg>
            {t.edit}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="text-danger bg-danger/8 active:bg-danger/15 flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] text-[15px] font-semibold"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
            {t.delete}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
