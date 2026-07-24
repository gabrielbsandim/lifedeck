'use client'

import { useState } from 'react'
import type { NotificationView } from '@lifedeck/application'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useSession } from '@/lib/api/use-session'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/lib/api/use-notifications'

const BCP47: Record<string, string> = {
  en: 'en-US',
  pt: 'pt-BR',
  es: 'es-ES',
}

type Rendered = { title: string; subtitle?: string }

// Turns a stored notification into human text. The reminder carries the event's
// title and start time in `data`, so the bell reads "Reminder: Dentist" with the
// day and time underneath instead of the raw "event-reminder" type.
function describe(
  notification: NotificationView,
  t: ReturnType<typeof useI18n>['messages']['notifications'],
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
  const tint =
    type === 'event-reminder'
      ? 'bg-brand-100 text-brand-600'
      : type === 'task-assigned'
        ? 'bg-violet-100 text-violet-500'
        : 'bg-line text-ink-500'
  return (
    <span
      className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${tint}`}
      aria-hidden
    >
      {type === 'event-reminder' ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      ) : type === 'task-assigned' ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      )}
    </span>
  )
}

export function NotificationBell() {
  const { messages, locale } = useI18n()
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
    <div className="relative">
      <button
        type="button"
        aria-label={t.open}
        onClick={() => setOpen(value => !value)}
        className="text-ink-500 hover:text-ink-800 relative flex h-9 w-9 items-center justify-center rounded-full"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="bg-danger absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="border-line absolute right-0 z-40 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-2xl border bg-white shadow-lg">
            <div className="border-line flex items-center justify-between border-b px-4 py-3">
              <span className="text-ink-800 text-sm font-semibold">
                {t.title}
              </span>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => markAll.mutate()}
                  className="text-brand-600 hover:text-brand-700 text-xs font-medium"
                >
                  {t.markAllRead}
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <p className="text-ink-500 px-4 py-6 text-center text-sm">
                {t.empty}
              </p>
            ) : (
              <ul className="max-h-80 overflow-y-auto">
                {items.map(item => {
                  const rendered = describe(item, t, locale, timeZone)
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => !item.isRead && markOne.mutate(item.id)}
                        className={`border-line flex w-full items-start gap-3 border-b px-4 py-3 text-left last:border-b-0 ${
                          item.isRead ? 'bg-white' : 'bg-brand-50'
                        }`}
                      >
                        <NotificationIcon type={item.type} />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="flex items-start justify-between gap-2">
                            <span className="text-ink-800 min-w-0 text-sm font-medium">
                              {rendered.title}
                            </span>
                            <span className="text-ink-400 flex-none text-[11px]">
                              {relativeTime(item.createdAt, locale)}
                            </span>
                          </span>
                          {rendered.subtitle && (
                            <span className="text-ink-500 text-xs">
                              {rendered.subtitle}
                            </span>
                          )}
                        </span>
                        {!item.isRead && (
                          <span
                            className="bg-brand-500 mt-1.5 h-2 w-2 flex-none rounded-full"
                            aria-hidden
                          />
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
