'use client'

import { useState, type FormEvent } from 'react'
import { Button, cn } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  useCalendarConnections,
  useConnectAppleCalendar,
  useConnectCalcomCalendar,
  useDisconnectCalendar,
  useSetDefaultCalendar,
} from '@/lib/api/use-calendar-connections'

const linkClass =
  'border-line text-ink-700 hover:bg-bg inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors'
const inputClass =
  'border-line text-ink-800 focus-visible:border-brand-600 h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none'

const PROVIDER_LABEL: Record<string, string> = {
  google: 'Google',
  apple: 'Apple',
  calcom: 'cal.com',
}

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

export function CalendarConnectionsManager({
  enabled = true,
  premium = false,
}: {
  enabled?: boolean
  premium?: boolean
}) {
  const { messages } = useI18n()
  const t = messages.calendar
  const c = t.connect
  const connections = useCalendarConnections(enabled)
  const disconnect = useDisconnectCalendar()
  const setDefault = useSetDefaultCalendar()
  const connectApple = useConnectAppleCalendar()
  const connectCalcom = useConnectCalcomCalendar()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [form, setForm] = useState<'apple' | 'calcom' | null>(null)
  const [email, setEmail] = useState('')
  const [secret, setSecret] = useState('')
  const list = connections.data ?? []

  const pending = connectApple.isPending || connectCalcom.isPending
  const error = connectApple.isError || connectCalcom.isError

  function openForm(provider: 'apple' | 'calcom') {
    setForm(provider)
    setEmail('')
    setSecret('')
    connectApple.reset()
    connectCalcom.reset()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const done = () => setForm(null)
    if (form === 'apple') {
      connectApple.mutate({ email, appPassword: secret }, { onSuccess: done })
    } else if (form === 'calcom') {
      connectCalcom.mutate({ email, apiKey: secret }, { onSuccess: done })
    }
  }

  return (
    <section className="border-line flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-ink-900 text-sm font-semibold">
          {t.connectedCalendars}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <a href="/api/v1/calendar/google/connect" className={linkClass}>
            <GoogleGlyph />
            {list.length > 0 ? t.addAnotherCalendar : t.connectGoogle}
          </a>
          {premium && (
            <>
              <button
                type="button"
                onClick={() => openForm('apple')}
                className={linkClass}
              >
                {c.connectApple}
              </button>
              <button
                type="button"
                onClick={() => openForm('calcom')}
                className={linkClass}
              >
                {c.connectCalcom}
              </button>
            </>
          )}
        </div>
      </div>

      {form && (
        <form
          onSubmit={submit}
          className="border-line flex flex-col gap-2 rounded-lg border bg-white/50 p-3"
        >
          <input
            type="email"
            required
            value={email}
            placeholder={form === 'apple' ? c.appleEmail : c.calcomEmail}
            aria-label={form === 'apple' ? c.appleEmail : c.calcomEmail}
            onChange={e => setEmail(e.target.value)}
            className={inputClass}
          />
          <input
            type="password"
            required
            value={secret}
            placeholder={form === 'apple' ? c.applePassword : c.calcomApiKey}
            aria-label={form === 'apple' ? c.applePassword : c.calcomApiKey}
            onChange={e => setSecret(e.target.value)}
            className={inputClass}
          />
          <p className="text-ink-500 text-xs">
            {form === 'apple' ? c.applePasswordHint : c.calcomReadOnly}
          </p>
          {error && <p className="text-xs text-red-600">{c.connectError}</p>}
          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? c.connecting : c.connect}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setForm(null)}>
              {c.cancel}
            </Button>
          </div>
        </form>
      )}

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
                <span className="text-ink-400 text-xs">
                  {PROVIDER_LABEL[connection.provider] ?? connection.provider}
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
                {confirmingId === connection.id && (
                  <button
                    type="button"
                    onClick={() => setConfirmingId(null)}
                    className="text-ink-500 text-xs hover:underline"
                  >
                    {c.cancel}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-ink-500 text-xs">{t.defaultCalendarHint}</p>
    </section>
  )
}
