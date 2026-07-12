'use client'

import { useState } from 'react'
import { cn } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  useCalendarConnections,
  useDisconnectCalendar,
  useSetDefaultCalendar,
} from '@/lib/api/use-calendar-connections'

const linkClass =
  'border-line text-ink-700 hover:bg-bg inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors'

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M21.35 11.1H12v2.8h5.35c-.25 1.4-1.5 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.95S8.78 6.1 12 6.1c1.83 0 3.06.78 3.76 1.45l2.57-2.48C16.7 3.5 14.6 2.6 12 2.6 6.95 2.6 2.85 6.7 2.85 12s4.1 9.4 9.15 9.4c5.28 0 8.78-3.71 8.78-8.94 0-.6-.06-1.06-.43-1.36Z"
      />
    </svg>
  )
}

export function GoogleCalendarsManager({
  enabled = true,
}: {
  enabled?: boolean
}) {
  const { messages } = useI18n()
  const t = messages.calendar
  const connections = useCalendarConnections(enabled)
  const disconnect = useDisconnectCalendar()
  const setDefault = useSetDefaultCalendar()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const list = connections.data ?? []

  return (
    <section className="border-line flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-ink-900 text-sm font-semibold">
          {t.connectedCalendars}
        </h2>
        <a href="/api/v1/calendar/google/connect" className={linkClass}>
          <GoogleGlyph />
          {list.length > 0 ? t.addAnotherCalendar : t.connectGoogle}
        </a>
      </div>

      {list.length > 0 && (
        <ul className="flex flex-col divide-y divide-[color:var(--line,#e5e7eb)]">
          {list.map(connection => (
            <li
              key={connection.id}
              className="flex items-center justify-between gap-2 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-ink-700 text-sm">
                  {connection.accountEmail ?? t.googleAccount}
                </span>
                {connection.isDefault && (
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    {t.defaultCalendar}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {!connection.isDefault && (
                  <button
                    type="button"
                    onClick={() => setDefault.mutate(connection.id)}
                    disabled={setDefault.isPending}
                    className="text-ink-600 text-xs hover:underline disabled:opacity-50"
                  >
                    {t.makeDefault}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (confirmingId === connection.id) {
                      disconnect.mutate(connection.id)
                      setConfirmingId(null)
                    } else {
                      setConfirmingId(connection.id)
                    }
                  }}
                  disabled={disconnect.isPending}
                  className={cn(
                    'text-xs hover:underline disabled:opacity-50',
                    confirmingId === connection.id
                      ? 'font-medium text-red-700'
                      : 'text-red-600',
                  )}
                >
                  {confirmingId === connection.id
                    ? t.disconnectConfirm
                    : t.disconnectCalendar}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-ink-500 text-xs">{t.defaultCalendarHint}</p>
    </section>
  )
}
