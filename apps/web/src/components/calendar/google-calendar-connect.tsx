'use client'

import { useI18n } from '@/lib/i18n/messages-provider'

export function GoogleCalendarConnect() {
  const { messages } = useI18n()
  return (
    <a
      href="/api/v1/calendar/google/connect"
      className="border-line text-ink-700 hover:bg-bg inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M21.35 11.1H12v2.8h5.35c-.25 1.4-1.5 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.95S8.78 6.1 12 6.1c1.83 0 3.06.78 3.76 1.45l2.57-2.48C16.7 3.5 14.6 2.6 12 2.6 6.95 2.6 2.85 6.7 2.85 12s4.1 9.4 9.15 9.4c5.28 0 8.78-3.71 8.78-8.94 0-.6-.06-1.06-.43-1.36Z"
        />
      </svg>
      {messages.calendar.connectGoogle}
    </a>
  )
}
