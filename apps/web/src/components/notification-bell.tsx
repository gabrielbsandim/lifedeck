'use client'

import { useState } from 'react'
import type { NotificationView } from '@lifedeck/application'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/lib/api/use-notifications'

function messageFor(notification: NotificationView, assigned: string): string {
  if (notification.type === 'task-assigned') {
    return assigned.replace('{task}', notification.data.taskTitle ?? '')
  }
  return notification.type
}

export function NotificationBell() {
  const { messages } = useI18n()
  const t = messages.notifications
  const notifications = useNotifications()
  const markAll = useMarkAllNotificationsRead()
  const markOne = useMarkNotificationRead()
  const [open, setOpen] = useState(false)

  const items = notifications.data?.items ?? []
  const unread = notifications.data?.unread ?? 0

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
                {items.map(item => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => !item.isRead && markOne.mutate(item.id)}
                      className={`border-line flex w-full flex-col gap-0.5 border-b px-4 py-3 text-left last:border-b-0 ${
                        item.isRead ? 'bg-white' : 'bg-brand-50'
                      }`}
                    >
                      <span className="text-ink-800 text-sm">
                        {messageFor(item, t.assigned)}
                      </span>
                      {item.data.listTitle && (
                        <span className="text-ink-500 text-xs">
                          {item.data.listTitle}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
